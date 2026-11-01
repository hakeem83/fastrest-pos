import React from 'react';
import { RestaurantSettings, Voucher } from '../types';
import { PrintPreviewDialog } from './PrintPreviewDialog';

interface Props {
  voucher: Voucher | null;
  settings: RestaurantSettings;
  onClose: () => void;
  printFormat?: 'standard' | 'thermal';
}

export const PrintableVoucher: React.FC<Props> = ({
  voucher,
  settings,
  onClose,
  printFormat = 'standard',
}) => {
  if (!voucher) return null;

  return (
    <PrintPreviewDialog
      voucher={voucher}
      settings={settings}
      initialFormat={printFormat}
      onClose={onClose}
    />
  );
};
