import { route } from "rwsdk/router";
import { NewOrderPage } from "./NewOrderPage";
import { CustomerOrdersPage } from "./CustomerOrdersPage";

export const orderRoutes = [
  route("/new", NewOrderPage),
  route("/", CustomerOrdersPage),
];
