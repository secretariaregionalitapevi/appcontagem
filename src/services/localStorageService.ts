import { robustGetItem, robustSetItem, robustRemoveItem } from '../utils/robustStorage';

const LOCAL_ENSAIO_KEY = 'local_ensaio';

export const localStorageService = {
  async getLocalEnsaio(): Promise<string | null> {
    try {
      return await robustGetItem(LOCAL_ENSAIO_KEY);
    } catch {
      return null;
    }
  },

  async setLocalEnsaio(localId: string): Promise<void> {
    try {
      await robustSetItem(LOCAL_ENSAIO_KEY, localId);
    } catch (error) {
      console.error('Erro ao salvar local de ensaio:', error);
    }
  },

  async removeLocalEnsaio(): Promise<void> {
    try {
      await robustRemoveItem(LOCAL_ENSAIO_KEY);
    } catch (error) {
      console.error('Erro ao remover local de ensaio:', error);
    }
  },
};
