'use client';

import React from 'react';

export interface AiCreativeStudioProps {
  product: {
    id_dropi: number;
    name: string;
    image_url?: string;
    gallery?: string[];
    sell_price_cop: number;
    cost_cop: number;
    suggested_price_cop?: number;
  };
  selectedOffer: '1x' | '2x';
  singlePrice: number;
  anchorPrice: number;
  duoPrice: number;
  duoSavings: number;
  selectedVariation?: string;
  packInfo: {
    singleTitle: string;
    duoTitle: string;
    singleBadge: string;
    duoBadge: string;
  };
}

/**
 * Funcionalidad oculta completamente a solicitud del usuario.
 */
export function SocialKitDownloader(_props: AiCreativeStudioProps) {
  return null;
}
