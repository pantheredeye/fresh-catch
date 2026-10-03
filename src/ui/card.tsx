import type { FC, PropsWithChildren } from "hono/jsx";

export const Card: FC<PropsWithChildren> = ({ children }) => <div class="card">{children}</div>;
