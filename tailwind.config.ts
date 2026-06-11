import type { Config } from "tailwindcss";

import plugin from "tailwindcss/plugin";



type ThemeValueMap = Record<string, string>;

type ThemeResolver = (path: string) => ThemeValueMap;

type ThemeContext = { theme: ThemeResolver };



function withoutDefault(values: ThemeValueMap) {

  return Object.fromEntries(

    Object.entries(values).filter(([key]) => key !== "DEFAULT")

  );

}



const animationUtilities = plugin(

  ({ addUtilities, matchUtilities, theme }) => {

    addUtilities({

      "@keyframes enter": theme("keyframes.enter"),

      "@keyframes exit": theme("keyframes.exit"),

      ".animate-in": {

        animationName: "enter",

        animationDuration: theme("animationDuration.DEFAULT"),

        "--tw-enter-opacity": "initial",

        "--tw-enter-scale": "initial",

        "--tw-enter-rotate": "initial",

        "--tw-enter-translate-x": "initial",

        "--tw-enter-translate-y": "initial",

      },

      ".animate-out": {

        animationName: "exit",

        animationDuration: theme("animationDuration.DEFAULT"),

        "--tw-exit-opacity": "initial",

        "--tw-exit-scale": "initial",

        "--tw-exit-rotate": "initial",

        "--tw-exit-translate-x": "initial",

        "--tw-exit-translate-y": "initial",

      },

    });



    matchUtilities(

      {

        "fade-in": (value: string) => ({ "--tw-enter-opacity": value }),

        "fade-out": (value: string) => ({ "--tw-exit-opacity": value }),

      },

      { values: theme("animationOpacity") }

    );



    matchUtilities(

      {

        "zoom-in": (value: string) => ({ "--tw-enter-scale": value }),

        "zoom-out": (value: string) => ({ "--tw-exit-scale": value }),

      },

      { values: theme("animationScale") }

    );



    matchUtilities(

      {

        "slide-in-from-top": (value: string) => ({

          "--tw-enter-translate-y": `-${value}`,

        }),

        "slide-in-from-bottom": (value: string) => ({

          "--tw-enter-translate-y": value,

        }),

        "slide-in-from-left": (value: string) => ({

          "--tw-enter-translate-x": `-${value}`,

        }),

        "slide-in-from-right": (value: string) => ({

          "--tw-enter-translate-x": value,

        }),

        "slide-out-to-top": (value: string) => ({

          "--tw-exit-translate-y": `-${value}`,

        }),

        "slide-out-to-bottom": (value: string) => ({

          "--tw-exit-translate-y": value,

        }),

        "slide-out-to-left": (value: string) => ({

          "--tw-exit-translate-x": `-${value}`,

        }),

        "slide-out-to-right": (value: string) => ({

          "--tw-exit-translate-x": value,

        }),

      },

      { values: theme("animationTranslate") }

    );



    matchUtilities(

      { duration: (value: string) => ({ animationDuration: value }) },

      { values: withoutDefault(theme("animationDuration")) }

    );

  },

  {

    theme: {

      extend: {

        animationDuration: ({ theme }: ThemeContext) => ({

          0: "0ms",

          ...theme("transitionDuration"),

        }),

        animationOpacity: ({ theme }: ThemeContext) => ({

          DEFAULT: "0",

          ...theme("opacity"),

        }),

        animationTranslate: ({ theme }: ThemeContext) => ({

          DEFAULT: "100%",

          ...theme("translate"),

        }),

        animationScale: ({ theme }: ThemeContext) => ({

          DEFAULT: "0",

          ...theme("scale"),

        }),

        keyframes: {

          enter: {

            from: {

              opacity: "var(--tw-enter-opacity, 1)",

              transform:

                "translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0))",

            },

          },

          exit: {

            to: {

              opacity: "var(--tw-exit-opacity, 1)",

              transform:

                "translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0))",

            },

          },

        },

      },

    },

  }

);



const config = {

  darkMode: ["class"],

  content: [

    "./pages/**/*.{ts,tsx}",

    "./components/**/*.{ts,tsx}",

    "./app/**/*.{ts,tsx}",

    "./src/**/*.{ts,tsx}",

  ],

  theme: {

    container: {

      center: true,

      padding: "2rem",

      screens: {

        "2xl": "1400px",

      },

    },

    extend: {

      screens: {

        xs: "375px",

      },

      colors: {

        border: "hsl(var(--border))",

        input: "hsl(var(--input))",

        ring: "hsl(var(--ring))",

        background: "hsl(var(--background))",

        foreground: "hsl(var(--foreground))",

        primary: {

          DEFAULT: "hsl(var(--primary))",

          foreground: "hsl(var(--primary-foreground))",

          light: "hsl(var(--primary-light))",

          dark: "hsl(var(--primary-dark))",

        },

        secondary: {

          DEFAULT: "hsl(var(--secondary))",

          foreground: "hsl(var(--secondary-foreground))",

        },

        destructive: {

          DEFAULT: "hsl(var(--destructive))",

          foreground: "hsl(var(--destructive-foreground))",

        },

        muted: {

          DEFAULT: "hsl(var(--muted))",

          foreground: "hsl(var(--muted-foreground))",

        },

        accent: {

          DEFAULT: "hsl(var(--accent))",

          foreground: "hsl(var(--accent-foreground))",

          orange: "hsl(var(--accent-orange))",

          purple: "hsl(var(--accent-purple))",

        },

        popover: {

          DEFAULT: "hsl(var(--popover))",

          foreground: "hsl(var(--popover-foreground))",

        },

        card: {

          DEFAULT: "hsl(var(--card))",

          foreground: "hsl(var(--card-foreground))",

        },

      },

      borderRadius: {

        lg: "var(--radius)",

        md: "calc(var(--radius) - 2px)",

        sm: "calc(var(--radius) - 4px)",

      },

      fontFamily: {

        sans: ["var(--font-jetbrains-mono)", "Segoe UI", "system-ui", "sans-serif"],

        jetbrains: ["var(--font-jetbrains-mono)", "Segoe UI", "system-ui", "sans-serif"],

      },

      keyframes: {

        "accordion-down": {

          from: { height: "0" },

          to: { height: "var(--radix-accordion-content-height)" },

        },

        "accordion-up": {

          from: { height: "var(--radix-accordion-content-height)" },

          to: { height: "0" },

        },

        gradient: {

          "0%, 100%": { backgroundPosition: "0% 50%" },

          "50%": { backgroundPosition: "100% 50%" },

        },

        "fade-in": {

          "0%": { opacity: "0", transform: "translateY(10px)" },

          "100%": { opacity: "1", transform: "translateY(0)" },

        },

        "fade-in-up": {

          "0%": { opacity: "0", transform: "translateY(20px)" },

          "100%": { opacity: "1", transform: "translateY(0)" },

        },

        "scale-in": {

          "0%": { opacity: "0", transform: "scale(0.95)" },

          "100%": { opacity: "1", transform: "scale(1)" },

        },

        shimmer: {

          "0%": { transform: "translateX(-100%)" },

          "100%": { transform: "translateX(100%)" },

        },

      },

      animation: {

        "accordion-down": "accordion-down 0.2s ease-out",

        "accordion-up": "accordion-up 0.2s ease-out",

        gradient: "gradient 3s ease infinite",

        "fade-in": "fade-in 0.3s ease-out",

        "fade-in-up": "fade-in-up 0.5s ease-out",

        "scale-in": "scale-in 0.2s ease-out",

        shimmer: "shimmer 2s infinite",

      },

      backgroundSize: {

        "gradient-size": "200% 200%",

      },

      zIndex: {

        sticky: "10",

        header: "100",

        overlay: "110",

        modal: "120",

        popover: "130",

        select: "140",

        toast: "200",

      },

    },

  },

  plugins: [animationUtilities],

} satisfies Config;



export default config;

