import "@ton-community/test-utils";

import { NftCollectionOpcodes } from "./../constants";
import { Cell, contractAddress, toNano, beginCell } from "ton-core";
import { Blockchain, OpenedContract } from "@ton-community/sandbox";
import { compile } from "@ton-community/blueprint";
import { buildNftItemStateInit } from "./../NftItem/helpers";
import { NftCollection } from ".";
import { getDefaultNftCollectionData } from "../utils";

describe("nft collection smc", () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile("NftCollection/NftCollection");
  });

  describe("nft collection getters", () => {
    let blockchain: Blockchain | null;
    let contract: OpenedContract<NftCollection> | null;
    let nftCollection: NftCollection | null;
    const defaultNftCollectionConfig = getDefaultNftCollectionData();

    beforeEach(async () => {
      blockchain = await Blockchain.create();
      nftCollection = NftCollection.createFromConfig(defaultNftCollectionConfig, code);
      contract = blockchain.openContract(nftCollection);

      const deployer = await blockchain.treasury("deployer");

      const deployResult = await contract.sendDeploy(deployer.getSender(), toNano("0.05"));

      expect(deployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: contract.address,
        deploy: true,
      });
    });

    afterEach(() => {
      blockchain = null;
      contract = null;
      nftCollection = null;
    });

    it("should return collection data", async () => {
      let res = await contract!.getCollectionData();

      expect(res.nextItemIndex).toEqual(defaultNftCollectionConfig.nextItemIndex);
      expect(res.content).toEqual(defaultNftCollectionConfig.collectionContent);
      expect(res.ownerAddress.toString()).toEqual(defaultNftCollectionConfig.ownerAddress.toString());
    });

    it("should return nft content", async () => {
      let nftContent = beginCell();
      nftContent.storeBuffer(Buffer.from("1"));

      let res = await contract!.getNftItemContent(0, nftContent.endCell());
      expect(res).toEqual(defaultNftCollectionConfig.commonContent + "1");
    });

    it("should return nft address by index", async () => {
      let index = 77;

      let res = await contract!.getNftAddressByIndex(index);

      // Basic nft item data
      let nftItemData = beginCell();
      nftItemData.storeUint(index, 64);
      nftItemData.storeAddress(contract!.address);

      let expectedAddress = contractAddress(0, {
        code: defaultNftCollectionConfig.nftItemCode,
        data: nftItemData.endCell(),
      });

      expect(res.toString()).toEqual(expectedAddress.toString());
    });

    it("should return royalty params", async () => {
      let res = await contract!.getRoyaltyParams();

      expect(res.royaltyBase).toEqual(defaultNftCollectionConfig.royaltyParams.royaltyBase);
      expect(res.royaltyFactor).toEqual(defaultNftCollectionConfig.royaltyParams.royaltyFactor);
      expect(res.royaltyAddress.toString()).toEqual(defaultNftCollectionConfig.royaltyParams.royaltyAddress.toString());
    });
  });

  it("should deploy new nft", async () => {
    const blockchain = await Blockchain.create();

    const ownerOfNftItemContract = await blockchain.treasury("nft_item_owner");
    const ownerOfNftItemAddress = ownerOfNftItemContract.address;

    const nftItemCode = await compile("NftItem/NftItem");
    const ownerOfCollectionContract = await blockchain.treasury("nft_collection_owner");
    const ownerOfCollectionAddress = ownerOfCollectionContract.address;

    const nftCollectionConfig = getDefaultNftCollectionData({
      nftItemCode: nftItemCode,
      ownerAddress: ownerOfCollectionAddress,
    });

    const nftCollection = NftCollection.createFromConfig(nftCollectionConfig, code);
    const NftCollectionAddress = nftCollection.address;

    const nftContract = blockchain.openContract(nftCollection);

    const deployer = await blockchain.treasury("deployer");

    const deployResult = await nftContract.sendDeploy(deployer.getSender(), toNano("0.8"));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftContract.address,
      deploy: true,
    });

    let itemIndex = 0;

    const newNftParams = {
      amount: toNano("0.5"),
      itemIndex,
      itemOwnerAddress: ownerOfNftItemAddress,
      itemContent: "test_content",
    };

    let result = await nftContract!.sendNewNftItem(ownerOfCollectionContract.getSender(), newNftParams);

    const { address: creadNftItemAddress, stateInit } = await buildNftItemStateInit({
      collectionAddress: NftCollectionAddress,
      itemIndex,
    });

    expect(result.transactions).toHaveTransaction({
      from: nftContract!.address,
      to: creadNftItemAddress,
      initCode: stateInit.code,
      initData: stateInit.data,
      success: true,
    });
  });

  it("should be able to change owner of collection", async () => {
    const blockchain = await Blockchain.create();
    const ownerOfCollectionContract = await blockchain.treasury("nft_collection_owner");
    const ownerAddress = ownerOfCollectionContract.address;

    const newOwnerOfCollectionContract = await blockchain.treasury("nft_collection_owner_2");
    const newOwnerAddress = newOwnerOfCollectionContract.address;

    const nftCollectionConfig = getDefaultNftCollectionData({ ownerAddress });
    const nftCollection = NftCollection.createFromConfig(nftCollectionConfig, code);

    const nftContract = blockchain.openContract(nftCollection);

    const deployer = await blockchain.treasury("deployer");
    const deployResult = await nftContract.sendDeploy(deployer.getSender(), toNano("0.05"));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftContract.address,
      deploy: true,
    });

    const params = {
      newOwnerAddress,
    };

    let resFirst = await nftContract!.getCollectionData();

    expect(resFirst.ownerAddress.toString()).toEqual(ownerAddress.toString());

    let result = await nftContract!.sendChangeOwner(ownerOfCollectionContract.getSender(), params);

    expect(result.transactions).toHaveTransaction({
      from: ownerOfCollectionContract.address,
      to: nftCollection.address,
      success: true,
      exitCode: 0,
    });

    let res = await nftContract!.getCollectionData();

    expect(res.ownerAddress.toString()).toEqual(newOwnerAddress.toString());
  });

  it("should deploy nft only if owner calls", async () => {
    const blockchain = await Blockchain.create();
    const ownerOfCollectionContract = await blockchain.treasury("nft_collection_owner");
    const randomContract = await blockchain.treasury("random_contract");
    const nftItemOwnerContract = await blockchain.treasury("nft_item_owner");

    const ownerAddress = ownerOfCollectionContract.address;
    const randomAddress = randomContract.address;
    const nftItemOwnerAddress = nftItemOwnerContract.address;
    const nftCollectionConfig = getDefaultNftCollectionData({ ownerAddress });

    const nftCollection = NftCollection.createFromConfig(nftCollectionConfig, code);

    const nftContract = blockchain.openContract(nftCollection);
    const deployer = await blockchain.treasury("deployer");

    const deployResult = await nftContract.sendDeploy(deployer.getSender(), toNano("0.05"));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftContract.address,
      deploy: true,
    });

    let itemIndex = 0;

    const newNftParams = {
      amount: toNano("0.5"),
      itemIndex,
      itemOwnerAddress: nftItemOwnerAddress,
      itemContent: "test_content",
    };

    let result = await nftContract!.sendNewNftItem(randomContract.getSender(), newNftParams);

    expect(result.transactions).toHaveTransaction({
      from: randomAddress,
      to: nftContract.address,
      exitCode: 401,
    });
  });

  it("should send royalty params", async () => {
    const blockchain = await Blockchain.create();
    const ownerOfCollectionContract = await blockchain.treasury("nft_collection_owner");
    const randomContract = await blockchain.treasury("random_contract");
    const ownerAddress = ownerOfCollectionContract.address;
    const randomAddress = randomContract.address;
    const nftCollectionConfig = getDefaultNftCollectionData({ ownerAddress });

    const nftCollection = NftCollection.createFromConfig(nftCollectionConfig, code);

    const nftContract = blockchain.openContract(nftCollection);
    const deployer = await blockchain.treasury("deployer");

    const deployResult = await nftContract.sendDeploy(deployer.getSender(), toNano("0.05"));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftContract.address,
      deploy: true,
    });

    let result = await nftContract!.sendGetRoyaltyParams(randomContract.getSender(), {});

    expect(result.transactions).toHaveTransaction({
      from: randomAddress,
      to: nftCollection.address,
      success: true,
      outMessagesCount: 1,
    });

    const royaltyBody = beginCell()
      .storeUint(NftCollectionOpcodes.ReportRoyaltyParams, 32)
      .storeUint(0, 64)
      .storeUint(nftCollectionConfig.royaltyParams.royaltyFactor, 16)
      .storeUint(nftCollectionConfig.royaltyParams.royaltyBase, 16)
      .storeAddress(nftCollectionConfig.royaltyParams.royaltyAddress)
      .endCell();

    expect(result.transactions).toHaveTransaction({
      from: nftCollection.address,
      to: randomAddress,
      body: royaltyBody,
      success: true,
    });
  });

  it("should edit content", async () => {
    const blockchain = await Blockchain.create();
    const ownerOfCollectionContract = await blockchain.treasury("nft_collection_owner");
    const randomContract = await blockchain.treasury("random_contract");
    const ownerAddress = ownerOfCollectionContract.address;
    const randomAddress = randomContract.address;
    const nftCollectionConfig = getDefaultNftCollectionData({ ownerAddress });

    const nftCollection = NftCollection.createFromConfig(nftCollectionConfig, code);

    const nftContract = blockchain.openContract(nftCollection);
    const deployer = await blockchain.treasury("deployer");

    const deployResult = await nftContract.sendDeploy(deployer.getSender(), toNano("0.05"));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: nftContract.address,
      deploy: true,
    });

    const params = {
      collectionContent: "new_content",
      commonContent: "new_common_content",
      royaltyParams: {
        royaltyFactor: 150,
        royaltyBase: 220,
        royaltyAddress: randomAddress,
      },
    };

    let result = await nftContract!.sendEditContent(ownerOfCollectionContract.getSender(), params);

    expect(result.transactions).toHaveTransaction({
      from: ownerAddress,
      to: nftCollection.address,
      success: true,
    });

    let res = await nftContract!.getCollectionData();

    expect(res.nextItemIndex).toEqual(nftCollectionConfig.nextItemIndex);
    expect(res.content).toEqual(params.collectionContent);
    expect(res.ownerAddress.toString()).toEqual(ownerAddress.toString());
  });
});
