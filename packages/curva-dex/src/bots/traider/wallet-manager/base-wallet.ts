import { IDEXWallet, IBalance, IBalanceList } from '../types';

import { getInitialConfig } from '@core/config';
import log from '@logger';

import path from 'path'
import * as fs from 'fs'

//export function getOrCreateKeypair(dir: string, keyName: string): Keypair {
//  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//  const authorityKey = dir + "/" + keyName + ".json";
//  if (fs.existsSync(authorityKey)) {
//    const data: {
//      secretKey: string;
//      publicKey: string;
//    } = JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
//    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
//  } else {
//    const keypair = Keypair.generate();
//    keypair.secretKey;
//    fs.writeFileSync(
//      authorityKey,
//      JSON.stringify({
//        secretKey: bs58.encode(keypair.secretKey),
//        publicKey: keypair.publicKey.toBase58(),
//      })
//    );
//    return keypair;
//  }
//}

export abstract class BaseWalletManager {
    abstract readonly nativeCurrency: string

    abstract createWallet(): Promise<IDEXWallet>;
    abstract collect(src: IDEXWallet[], dst: Omit<IDEXWallet, "secretKey">): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]>
    abstract collectToken(src: IDEXWallet[], dst: Omit<IDEXWallet, "secretKey">, mint: string): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]>
    abstract send(src: Omit<IDEXWallet, "publicKey">, dst: Omit<IDEXWallet, "secretKey">, amount: bigint): Promise<void>
    abstract distribute(src: Omit<IDEXWallet, "publicKey">, dst: { wallet: Omit<IDEXWallet, "secretKey">, amount: bigint }[]): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]>
    abstract balance(wallet: Omit<IDEXWallet, "secretKey">): Promise<IBalanceList>

    protected saveUsedWallet(wallet: IDEXWallet) {
        const cfg = getInitialConfig()
        const pathToSaveFile = path.join(
            cfg.server.fileStorage.path,
            "used-wallets.json"
        )
        const data = fs.readFileSync(pathToSaveFile, 'utf8')
        try {
            const obj: any = JSON.parse(data)
            if (!obj?.wallets) {
                obj.wallets = []
            }
            obj.wallets.push(wallet)
            fs.writeFileSync(pathToSaveFile, JSON.stringify(obj, null, 4))
        } catch (e) {
            log.error(`Error saving used wallets: ${e}`)
        }
    }

    public nativeCurrencyBalance<T extends bigint|number = bigint>(balances: IBalanceList<T>) {
        return balances.find(b => b.mint === this.nativeCurrency)
    }

    static cmpWallets(a: IDEXWallet, b: IDEXWallet) {
        return (a.publicKey === b.publicKey) && (a.secretKey === b.secretKey)
    }
}
