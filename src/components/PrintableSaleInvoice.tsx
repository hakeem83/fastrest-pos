import React from 'react';
import { RestaurantSettings, SaleOrder } from '../types';
import { PrintPreviewDialog } from './PrintPreviewDialog';

interface Props {
  order: SaleOrder | null;
  settings: RestaurantSettings;
  onClose: () => void;
  printFormat?: 'thermal' | 'standard';
}

export const PrintableSaleInvoice: React.FC<Props> = ({
  order,
  settings,
  onClose,
  printFormat = 'thermal',
}) => {
  if (!order) return null;

  return (
    <PrintPreviewDialog
      order={order}
      settings={settings}
      initialFormat={printFormat}
      onClose={onClose}
    />
  );
};
