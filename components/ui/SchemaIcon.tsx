import { Users, Package, ShoppingCart, Briefcase, Globe } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const SCHEMA_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  users:          Users,
  package:        Package,
  'shopping-cart':ShoppingCart,
  briefcase:      Briefcase,
  globe:          Globe,
};

interface SchemaIconProps extends LucideProps {
  icon: string;
}

export default function SchemaIcon({ icon, ...props }: SchemaIconProps) {
  const Icon = SCHEMA_ICONS[icon] ?? Globe;
  return <Icon {...props} />;
}
