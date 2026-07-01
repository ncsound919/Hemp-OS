import { toast } from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, { 
    position: 'top-center', 
    duration: 2200,
    style: { background: '#1a1a1c', color: '#fff', border: '1px solid #22c55e' }
  });
};

export const showError = (message: string) => {
  toast.error(message, { 
    position: 'top-center', 
    duration: 4500,
    style: { background: '#1a1a1c', color: '#fff', border: '1px solid #ef4444' }
  });
};
