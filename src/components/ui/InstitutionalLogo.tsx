interface InstitutionalLogoProps {
  className?: string;
}

export function InstitutionalLogo({ className = 'h-16 w-12' }: InstitutionalLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/brand/cetpro-escudo.png`}
      alt="Escudo del CETPRO Micaela Bastidas, San Miguel"
      width={1528}
      height={2140}
      className={`shrink-0 object-contain ${className}`}
      decoding="async"
      draggable={false}
    />
  );
}
