// Re-export for case-sensitive import paths (e.g. @/components/ui/card on Vercel/Linux).
// Use explicit ./card/index to avoid resolving to this file on case-insensitive filesystems.
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card/index'
export type {
  CardProps,
  CardHeaderProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
} from './card/index'
