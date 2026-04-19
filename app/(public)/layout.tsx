import { Topbar } from "@/src/components/ui/Topbar";
import { Footer } from "@/src/components/ui/Footer";

/**
 * Layout for the public (marketing / patient / clinic) surface.
 * Everything outside /admin lives in the (public) route group so
 * /admin can use a minimal admin chrome via its own layout.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      {children}
      <Footer />
    </>
  );
}
