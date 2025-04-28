import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "@/components/theme-provider";

// Initialize Lora as the main font
const lora = Lora({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    style: ['normal', 'italic'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: "CryptoSim",
    description: "A cryptocurrency portfolio simulator",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head />
            <body className={lora.className} suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <UserProvider>
                        {children}
                    </UserProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}