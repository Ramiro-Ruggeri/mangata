export function productImageView(image: string, index: number) {
  if (/(?:-|\/)(frente|delante)(?:\.|-)/i.test(image)) return "Frente";
  if (/(?:-|\/)(dorso|atras)(?:\.|-)/i.test(image)) return "Dorso";
  return `Foto ${index + 1}`;
}
