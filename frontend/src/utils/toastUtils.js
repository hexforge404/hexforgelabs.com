import { toast } from 'react-toastify';

const toastOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'dark',
};

export const successToast = (message) => toast.success(message, toastOptions);
export const errorToast = (message) => toast.error(message, toastOptions);
export const warningToast = (message) => toast.warning(message, toastOptions);
export const infoToast = (message) => toast.info(message, toastOptions);
