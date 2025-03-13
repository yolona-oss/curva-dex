import { RPC_END_POINT } from "@core/providers/solana";

export async function getTokenHoldersFromHeliusApi(mint: string): Promise<number> {
    let page = 1;
    let allOwners = new Set();

    while (true) {
        try {
            const response = await fetch(RPC_END_POINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "getTokenAccounts",
                    id: "helius-test",
                    params: {
                        page: page,
                        limit: 1000,
                        displayOptions: {},
                        mint: mint
                    },
                }),
            });
            const data = await response.json();

            if (!data.result || data.result.token_accounts.length === 0) {
                break;
            }
            data.result.token_accounts.forEach((account: any) =>
                allOwners.add(account.owner)
            );
        } finally {
            page++;
        }
    }

    return allOwners.size
}
