"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    Home,
    ShoppingCart,
    Package,
    Users,
    Settings,
    Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MerchantQuickActions } from "./merchant-quick-actions";

const nav = [
    {
        href: "/merchant/dashboard",
        label: "Home",
        icon: Home,
    },
    {
        href: "/merchant/pos",
        label: "POS",
        icon: ShoppingCart,
    },
    {
        href: "/merchant/products",
        label: "Products",
        icon: Package,
    },
    {
        href: "/merchant/customers",
        label: "Customers",
        icon: Users,
    },
    {
        href: "/merchant/settings",
        label: "Settings",
        icon: Settings,
    },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed inset-x-0 bottom-4 z-50 flex justify-center md:hidden">

            <div className="relative flex h-16 w-[94%] max-w-md items-center justify-around rounded-2xl border bg-background/90 px-3 shadow-2xl backdrop-blur-xl">

                {nav.slice(0, 2).map((item) => {

                    const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-1 flex-col items-center justify-center"
                        >

                            {active && (
                                <motion.div
                                    layoutId="mobile-nav"
                                    className="absolute -top-1 h-1 w-8 rounded-full bg-primary"
                                />
                            )}

                            <item.icon
                                className={cn(
                                    "h-4 w-4 transition-colors",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            />

                            <span
                                className={cn(
                                    "text-[8px]",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </span>

                        </Link>
                    );

                })}

                <div className="-mt-10">

                    <div className="-mt-8">
                        <MerchantQuickActions iconOnly />
                    </div>

                </div>

                {nav.slice(2).map((item) => {

                    const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-1 flex-col items-center justify-center"
                        >

                            {active && (
                                <motion.div
                                    layoutId="mobile-nav"
                                    className="absolute -top-1 h-1 w-8 rounded-full bg-primary"
                                />
                            )}

                            <item.icon
                                className={cn(
                                    "h-4 w-4 transition-colors",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            />

                            <span
                                className={cn(
                                    "text-[8px]",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </span>

                        </Link>
                    );

                })}

            </div>

        </nav>
    );
}