import { CompanyTypes } from "israeli-bank-scrapers-by-e.a";

export const SupportedCompanies = {
  [CompanyTypes.discount]: CompanyTypes.discount,
  [CompanyTypes.max]: CompanyTypes.max,
  [CompanyTypes.behatsdaa]: CompanyTypes.behatsdaa,
  [CompanyTypes.leumi]: CompanyTypes.leumi,
  [CompanyTypes.visaCal]: CompanyTypes.visaCal,
};

export const CreditCardProviders = [
  CompanyTypes.visaCal,
  CompanyTypes.max,
  CompanyTypes.behatsdaa,
];

export const isCardProviderCompany = (company: string) => {
  return CreditCardProviders.includes(CompanyTypes[company]) || false;
};