import { Context, Contract } from "fabric-contract-api";
import { Gateway, Wallets } from "fabric-network";
import * as fs from "fs";
import * as path from "path";

async function main() {
  try {
    // ネットワーク接続用の設定
    const ccpPath = path.resolve(__dirname, "..", "..", "connection.json");
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // ウォレットのロード
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // ゲートウェイのセットアップ
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: "user1",
      discovery: { enabled: true, asLocalhost: true },
    });

    // ネットワークチャネルとコントラクトへの接続
    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("nftContract");

    // NFT作成のサンプル呼び出し
    await createNFT(contract, "token123", "owner1", "example metadata");

    // 所有権の変更（トランスファー）のサンプル呼び出し
    await transferNFT(contract, "token123", "newOwner");

    // ゲートウェイを閉じる
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`);
    process.exit(1);
  }
}

main();

export class NFTContract extends Contract {
  // NFT作成のチェーンコード
  public async CreateNFT(
    ctx: Context,
    tokenId: string,
    owner: string,
    metadata: string
  ): Promise<void> {
    const nft = {
      tokenId: tokenId,
      owner: owner,
      metadata: metadata,
    };
    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(nft)));
  }

  // NFT所有者の変更
  public async TransferNFT(
    ctx: Context,
    tokenId: string,
    newOwner: string
  ): Promise<void> {
    const nftAsBytes = await ctx.stub.getState(tokenId);
    if (!nftAsBytes || nftAsBytes.length === 0) {
      throw new Error(`The NFT with tokenId ${tokenId} does not exist`);
    }
    const nft = JSON.parse(nftAsBytes.toString());
    nft.owner = newOwner;
    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(nft)));
  }
}
