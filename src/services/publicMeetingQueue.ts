import {
  MeetingPerson,
  PublicMeetingService,
  publicMeetingService,
  meetingRegistrationId,
} from './publicMeetingService';

const PREFIX = 'ram-pending-v1:';
interface PendingMeeting {
  city: string;
  church: string;
  person: MeetingPerson;
  queuedAt: number;
}
export interface MeetingQueueState {
  pending: number;
  sending: boolean;
  error: string;
  delivered: number;
}

export class PublicMeetingQueue {
  private running = false;
  private error = '';
  private delivered = 0;
  private listeners = new Set<(state: MeetingQueueState) => void>();
  constructor(
    private service: Pick<PublicMeetingService, 'confirm'> = publicMeetingService,
    private storage: () => Storage = () => localStorage
  ) {}
  private entries(): Array<{ key: string; value: PendingMeeting }> {
    const storage = this.storage();
    const items = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const value = JSON.parse(storage.getItem(key) || 'null') as PendingMeeting;
      if (!value?.city || !value.church || !value.person?.id || !value.person.nome)
        throw new Error('Não foi possível ler os registros pendentes deste aparelho.');
      items.push({ key, value });
    }
    return items.sort((a, b) => a.value.queuedAt - b.value.queuedAt);
  }
  state(): MeetingQueueState {
    try {
      return {
        pending: this.entries().length,
        sending: this.running,
        error: this.error,
        delivered: this.delivered,
      };
    } catch {
      return {
        pending: 0,
        sending: false,
        error: 'Não foi possível acessar os registros salvos neste aparelho.',
        delivered: this.delivered,
      };
    }
  }
  private emit() {
    const state = this.state();
    this.listeners.forEach(listener => listener(state));
  }
  subscribe(listener: (state: MeetingQueueState) => void) {
    this.listeners.add(listener);
    listener(this.state());
    return () => {
      this.listeners.delete(listener);
    };
  }
  enqueue(city: string, church: string, person: MeetingPerson): void {
    const key = PREFIX + meetingRegistrationId(city, church, person.nome);
    const storage = this.storage();
    if (!storage.getItem(key)) {
      const raw = JSON.stringify({ city, church, person, queuedAt: Date.now() });
      storage.setItem(key, raw);
      if (storage.getItem(key) !== raw)
        throw new Error('Não foi possível salvar o registro neste aparelho.');
    }
    this.emit();
    void this.flush();
  }
  async flush(): Promise<void> {
    if (this.running || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    this.running = true;
    this.error = '';
    this.emit();
    try {
      const drain = async () => {
        // Each item has its own storage key, so a new enqueue never overwrites an in-flight item.
        const attempted = new Set<string>();
        let item;
        while ((item = this.entries().find(entry => !attempted.has(entry.key)))) {
          attempted.add(item.key);
          try {
            await this.service.confirm(
              item.value.city,
              item.value.church,
              item.value.person.id,
              item.value.person
            );
            this.storage().removeItem(item.key);
            this.delivered++;
          } catch (reason) {
            this.error =
              reason instanceof Error ? reason.message : 'O envio será tentado novamente.';
          }
          this.emit();
        }
      };
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request(
          'ram-background-delivery',
          { ifAvailable: true },
          async lock => {
            if (lock) await drain();
          }
        );
      } else await drain();
    } catch (reason) {
      this.error = reason instanceof Error ? reason.message : 'O envio será tentado novamente.';
    } finally {
      this.running = false;
      this.emit();
    }
  }
  start(): () => void {
    const retry = () => {
      void this.flush();
    };
    window.addEventListener('online', retry);
    const timer = setInterval(retry, 8000);
    retry();
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(timer);
    };
  }
}
export const publicMeetingQueue = new PublicMeetingQueue();
