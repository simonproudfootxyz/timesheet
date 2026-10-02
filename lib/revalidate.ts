import { revalidatePath } from "next/cache";

export function refreshApp() {
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/clients");
}
