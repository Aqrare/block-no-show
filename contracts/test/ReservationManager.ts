import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";



describe("ReservationManager", function () {
  let reservationManager: Contract;
  let depositToken: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let restaurant: Signer;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const DEPOSIT_AMOUNT = ethers.parseEther("100");

  

  beforeEach(async function () {
    [owner, user1, user2, restaurant] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    depositToken = await MockToken.deploy("Mock USDC", "mUSDC", INITIAL_SUPPLY);
    await depositToken.deployed();

    // Deploy ReservationManager
    const ReservationManager = await ethers.getContractFactory(
      "ReservationManager"
    );
    reservationManager = await ReservationManager.deploy(depositToken.address);
    await reservationManager.deployed();

    // Distribute some tokens to users
    await depositToken.transfer(
      await user1.getAddress(),
      DEPOSIT_AMOUNT * BigInt(10)
    );
    await depositToken.transfer(
      await user2.getAddress(),
      DEPOSIT_AMOUNT * BigInt(10)
    );
  });

  describe("Reservation Creation", function () {
    it("Should create a reservation successfully", async function () {
      await depositToken
        .connect(user1)
        .approve(reservationManager.address, DEPOSIT_AMOUNT);
      const futureDate = (await time.latest()) + 86400; // 1 day in the future

      await expect(
        reservationManager
          .connect(user1)
          .createReservation("Restaurant A", futureDate, 2, DEPOSIT_AMOUNT)
      )
        .to.emit(reservationManager, "ReservationCreated")
        .withArgs(
          1,
          await user1.getAddress(),
          "Restaurant A",
          futureDate,
          2,
          DEPOSIT_AMOUNT
        );

      const reservation = await reservationManager.getReservation(1);
      expect(reservation.user).to.equal(await user1.getAddress());
      expect(reservation.restaurant).to.equal("Restaurant A");
      expect(reservation.date).to.equal(futureDate);
      expect(reservation.people).to.equal(2);
      expect(reservation.deposit).to.equal(DEPOSIT_AMOUNT);
      expect(reservation.isActive).to.be.true;
      expect(reservation.isCheckedIn).to.be.false;
    });

    it("Should fail to create a reservation with past date", async function () {
      await depositToken
        .connect(user1)
        .approve(reservationManager.address, DEPOSIT_AMOUNT);
      const pastDate = (await time.latest()) - 86400; // 1 day in the past

      await expect(
        reservationManager
          .connect(user1)
          .createReservation("Restaurant A", pastDate, 2, DEPOSIT_AMOUNT)
      ).to.be.revertedWith("Reservation date must be in the future");
    });
  });

  describe("Reservation Management", function () {
    beforeEach(async function () {
      await depositToken
        .connect(user1)
        .approve(reservationManager.address, DEPOSIT_AMOUNT);
      const futureDate = (await time.latest()) + 86400; // 1 day in the future
      await reservationManager
        .connect(user1)
        .createReservation("Restaurant A", futureDate, 2, DEPOSIT_AMOUNT);
    });

    it("Should change reservation details successfully", async function () {
      const newDate = (await time.latest()) + 172800; // 2 days in the future
      await expect(
        reservationManager.connect(user1).changeReservation(1, newDate, 3)
      )
        .to.emit(reservationManager, "ReservationChanged")
        .withArgs(1, newDate, 3);

      const reservation = await reservationManager.getReservation(1);
      expect(reservation.date).to.equal(newDate);
      expect(reservation.people).to.equal(3);
    });

    it("Should cancel reservation and refund deposit", async function () {
      const initialBalance = await depositToken.balanceOf(
        await user1.getAddress()
      );

      await expect(reservationManager.connect(user1).cancelReservation(1))
        .to.emit(reservationManager, "ReservationCancelled")
        .withArgs(1);

      const finalBalance = await depositToken.balanceOf(
        await user1.getAddress()
      );
      expect(finalBalance.sub(initialBalance)).to.equal(DEPOSIT_AMOUNT);

      const reservation = await reservationManager.getReservation(1);
      expect(reservation.isActive).to.be.false;
    });

    it("Should check in successfully", async function () {
      await expect(reservationManager.connect(user1).checkIn(1))
        .to.emit(reservationManager, "CheckedIn")
        .withArgs(1);

      const reservation = await reservationManager.getReservation(1);
      expect(reservation.isCheckedIn).to.be.true;
    });

    it("Should withdraw deposit after check-in", async function () {
      await reservationManager.connect(user1).checkIn(1);

      const initialBalance = await depositToken.balanceOf(
        await user1.getAddress()
      );

      await expect(reservationManager.connect(user1).withdraw(1))
        .to.emit(reservationManager, "DepositWithdrawn")
        .withArgs(1, await user1.getAddress(), DEPOSIT_AMOUNT);

      const finalBalance = await depositToken.balanceOf(
        await user1.getAddress()
      );
      expect(finalBalance.sub(initialBalance)).to.equal(DEPOSIT_AMOUNT);

      const reservation = await reservationManager.getReservation(1);
      expect(reservation.deposit).to.equal(0);
    });
  });

  describe("User Reservations", function () {
    it("Should return correct user reservations", async function () {
      await depositToken
        .connect(user1)
        .approve(reservationManager.address, DEPOSIT_AMOUNT.mul(2));
      const futureDate1 = (await time.latest()) + 86400; // 1 day in the future
      const futureDate2 = (await time.latest()) + 172800; // 2 days in the future

      await reservationManager
        .connect(user1)
        .createReservation("Restaurant A", futureDate1, 2, DEPOSIT_AMOUNT);
      await reservationManager
        .connect(user1)
        .createReservation("Restaurant B", futureDate2, 3, DEPOSIT_AMOUNT);

      const userReservations = await reservationManager.getUserReservations(
        await user1.getAddress()
      );
      expect(userReservations.length).to.equal(2);
      expect(userReservations[0]).to.equal(1);
      expect(userReservations[1]).to.equal(2);
    });
  });
});
