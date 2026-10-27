import { Outlet } from "react-router-dom";
import { UpdateNotification } from "@/components/feature/UpdateNotification";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <UpdateNotification />
    </>
  );
}
