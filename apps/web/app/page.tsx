import UsersPage from "./pages/users";
import { ReactQueryProvider } from "../providers/providers";

export default function Home() {
  return (
    <div>
      <h1>Hello HOME</h1>

      <ReactQueryProvider>
        <UsersPage />
      </ReactQueryProvider>
    </div>
  );
}
