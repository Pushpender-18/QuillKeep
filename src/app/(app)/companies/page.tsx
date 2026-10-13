import { CompaniesShell } from './companies-shell';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function CompaniesPage({ searchParams }: PageProps) {
  return <CompaniesShell searchParams={searchParams} />;
}

