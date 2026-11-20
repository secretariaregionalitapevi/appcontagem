jest.mock('../config/env', () => ({ env: {} }));
import { PublicMeetingQueue } from '../services/publicMeetingQueue';

function storage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: key => {
      data.delete(key);
    },
    key: index => [...data.keys()][index] ?? null,
  };
}
const person = { id: 'person-1', nome: 'JOÃO DE TESTE', cargo: 'MÚSICO' };
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
describe('Durable public meeting queue', () => {
  it('persists immediately and releases the caller before network completion', async () => {
    const disk = storage();
    let finish!: (value: any) => void;
    const confirm = jest.fn(
      () =>
        new Promise<any>(resolve => {
          finish = resolve;
        })
    );
    const queue = new PublicMeetingQueue({ confirm }, () => disk);
    queue.enqueue('ITAPEVI', 'common', person);
    expect(disk.length).toBe(1);
    expect(queue.state()).toMatchObject({ pending: 1, sending: true });
    queue.enqueue('ITAPEVI', 'common', { id: 'manual_MANOEL LUIZ', nome: 'MANOEL LUIZ' });
    expect(disk.length).toBe(2);
    confirm.mockResolvedValueOnce({ id: 'receipt-2' });
    finish({ id: 'receipt-1' });
    await settle();
    expect(queue.state()).toMatchObject({ pending: 0, delivered: 2 });
    expect(confirm).toHaveBeenCalledTimes(2);
  });
  it('retains failed items and sends the next person without losing either record', async () => {
    const disk = storage();
    const confirm = jest
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue({ id: 'receipt' });
    const queue = new PublicMeetingQueue({ confirm }, () => disk);
    queue.enqueue('ITAPEVI', 'common', person);
    queue.enqueue('ITAPEVI', 'common', { id: 'manual_MANOEL LUIZ', nome: 'MANOEL LUIZ' });
    await settle();
    expect(queue.state()).toMatchObject({ pending: 1, delivered: 1, error: 'Offline' });
    await queue.flush();
    expect(queue.state()).toMatchObject({ pending: 0, delivered: 2 });
  });
  it('restores pending selections after reload and removes only acknowledged entries', async () => {
    const disk = storage();
    const first = new PublicMeetingQueue(
      { confirm: jest.fn().mockRejectedValue(new Error('Offline')) },
      () => disk
    );
    first.enqueue('ITAPEVI', 'common', person);
    await settle();
    const confirm = jest.fn().mockResolvedValue({ id: 'receipt' });
    const reloaded = new PublicMeetingQueue({ confirm }, () => disk);
    await reloaded.flush();
    expect(confirm).toHaveBeenCalledWith('ITAPEVI', 'common', person.id, person);
    expect(disk.length).toBe(0);
  });
  it('deduplicates repeated clicks while the request is pending', async () => {
    const disk = storage();
    const queue = new PublicMeetingQueue(
      { confirm: jest.fn(() => new Promise(() => {})) },
      () => disk
    );
    queue.enqueue('ITAPEVI', 'common', person);
    queue.enqueue('ITAPEVI', 'common', person);
    expect(disk.length).toBe(1);
  });
  it('does not acknowledge a registration when persistent storage fails', () => {
    const disk = storage();
    disk.setItem = () => {
      throw new Error('Quota exceeded');
    };
    const confirm = jest.fn();
    const queue = new PublicMeetingQueue({ confirm }, () => disk);
    expect(() => queue.enqueue('ITAPEVI', 'common', person)).toThrow('Quota exceeded');
    expect(confirm).not.toHaveBeenCalled();
  });
});
