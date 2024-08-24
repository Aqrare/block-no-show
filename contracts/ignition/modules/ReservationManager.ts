import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ReservationManagerModule = buildModule(
  "ReservationManagerModule",
  (m) => {
    const reservationManager = m.contract("ReservationManager", [
      "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    ]);
    return { reservationManager };
  }
);

export default ReservationManagerModule;
