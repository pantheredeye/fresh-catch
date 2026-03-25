import { RequestInfo } from "rwsdk/worker";
import { Login } from "../user/Login";
import { NewOrderUI } from "./NewOrderUI";

export function NewOrderPage({ ctx }: RequestInfo) {
  if (!ctx.user) {
    return <Login ctx={ctx} />;
  }

  const defaultContact = {
    name: ctx.user.name || ctx.user.username,
    phone: ctx.user.phone || ''
  };

  return <NewOrderUI ctx={ctx} defaultContact={defaultContact} />;
}
