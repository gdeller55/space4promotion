import { useState } from 'react';

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    onConfirm: () => {}
  });

  const confirm = ({ title, description, confirmText, cancelText, variant, onConfirm }) => {
    setState({
      open: true,
      title,
      description,
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      variant: variant || 'default',
      onConfirm
    });
  };

  const handleOpenChange = (open) => {
    setState(prev => ({ ...prev, open }));
  };

  return { confirmState: state, confirm, handleOpenChange };
}