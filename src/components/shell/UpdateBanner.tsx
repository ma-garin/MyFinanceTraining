import { useEffect, useState } from 'react';
import { applyUpdate, onSwUpdate } from '../../infrastructure/swUpdate';

export default function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => onSwUpdate(setReg), []);

  if (!reg) return null;

  return (
    <div className="update-banner" role="status">
      <span>新しいバージョンがあります</span>
      <button type="button" className="btn btn-primary" onClick={() => applyUpdate(reg)}>
        更新する
      </button>
    </div>
  );
}
