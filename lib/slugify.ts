// Genera slug URL-amigable desde nombre de negocio
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, "") // elimina acentos
    .replace(/[^a-z0-9\s-]/g, "") // solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, "-") // espacios → guiones
    .replace(/-+/g, "-"); // guiones múltiples → uno
}

// Genera subdominio limpio (solo letras y números)
export function toSubdomain(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
