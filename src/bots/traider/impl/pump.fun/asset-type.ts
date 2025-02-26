import { IBaseDEXTradeAsset } from "@bots/traider/types";

export interface PumpFunAssetType extends IBaseDEXTradeAsset { }

export type CreateTokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  file: Blob;
  twitter?: string;
  telegram?: string;
  website?: string;
};

export type TokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  showName: boolean;
  createdOn: string;
  twitter: string;
};
