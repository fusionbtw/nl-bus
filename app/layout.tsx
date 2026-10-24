import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--fontBricolage",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fontInstrument",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--fontSerif",
});

export const metadata: Metadata = {
  title: "NL Bus: Mobilidade inteligente em Nova Lima",
  description:
    "O NL Bus conecta passageiros ao transporte público de Nova Lima/MG: rotas, horários, rastreamento em tempo real e alertas de chegada. Sua cidade em movimento, mobilidade inclusiva e conectada.",
  metadataBase: new URL("https://nl-bus.vercel.app"),
  openGraph: {
    title: "NL Bus: Tecnologia a favor de pessoas reais",
    description:
      "Plataforma inteligente que conecta passageiros ao transporte público de Nova Lima. Projeto desenvolvido por Pedro Costa, Yago, Sarah e Ana.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-cover.jpg", width: 1200, height: 630, alt: "NL Bus" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#071523",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
