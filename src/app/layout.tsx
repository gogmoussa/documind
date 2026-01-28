import type { Metadata } from "next";
import { Space_Grotesk, Roboto_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
});

const robotoMono = Roboto_Mono({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
    title: "DocuMind | Automated Architecture Documentation",
    description: "AI-powered codebase visualization and documentation agent.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${spaceGrotesk.variable} ${robotoMono.variable}`}>
            <body className="antialiased overflow-hidden">
                {children}
            </body>
        </html>
    );
}
