# Info
I generated a frontend using Figma, the Figma generated code used a different framework. We have integrated the Figma code into the existing fronted.
The new frontend follows the same structure as the existing frontend. Both have been merged into main. We now need to sort out the
issues that arise from the merge. 

You can retrieve additional context from this agent run:
https://github.com/rmwondolleck/hobby-inventory/tasks/38938798-dfba-4d6a-bbf5-01f16ed3248b?author=rmwondolleck

PS C:\Users\black\IdeaProjects\project-inventory>
git pull
remote: Enumerating objects: 27, done.                                                                                                                                  
remote: Counting objects: 100% (27/27), done.                                                                                                                           
remote: Compressing objects: 100% (12/12), done.                                                                                                                        
remote: Total 27 (delta 18), reused 18 (delta 13), pack-reused 0 (from 0)                                                                                               
Unpacking objects: 100% (27/27), 6.82 KiB | 54.00 KiB/s, done.
From https://github.com/rmwondolleck/hobby-inventory
f404439..4ebf89d  main               -> origin/main
* [new branch]      copilot/sub-pr-112 -> origin/copilot/sub-pr-112
* [new branch]      copilot/sub-pr-112-again -> origin/copilot/sub-pr-112-again
  dcb7827..a011cc8  frontend           -> origin/frontend
  Updating f404439..4ebf89d
  Fast-forward
  .../create-frontend-integration-issues.yml         |  536 +++
  package-lock.json                                  | 3952 ++++++++++++++++++--
  package.json                                       |   46 +-
  src/app/globals.css                                |  149 +-
  src/app/layout.tsx                                 |   72 +-
  src/components/AppShell.tsx                        |   92 +
  src/components/DataTable.tsx                       |  110 +
  src/components/StatusBadge.tsx                     |   39 +
  src/components/ui/Badge.tsx                        |   29 -
  src/components/ui/__tests__/Badge.test.tsx         |   28 +-
  src/components/ui/accordion.tsx                    |   66 +
  src/components/ui/alert-dialog.tsx                 |  157 +
  src/components/ui/alert.tsx                        |   66 +
  src/components/ui/aspect-ratio.tsx                 |   11 +
  src/components/ui/avatar.tsx                       |   53 +
  src/components/ui/badge.tsx                        |   50 +
  src/components/ui/breadcrumb.tsx                   |  109 +
  src/components/ui/button.tsx                       |   58 +
  src/components/ui/calendar.tsx                     |   75 +
  src/components/ui/card.tsx                         |   92 +
  src/components/ui/carousel.tsx                     |  241 ++
  src/components/ui/chart.tsx                        |  353 ++
  src/components/ui/checkbox.tsx                     |   32 +
  src/components/ui/collapsible.tsx                  |   33 +
  src/components/ui/command.tsx                      |  177 +
  src/components/ui/context-menu.tsx                 |  252 ++
  src/components/ui/dialog.tsx                       |  135 +
  src/components/ui/drawer.tsx                       |  132 +
  src/components/ui/dropdown-menu.tsx                |  257 ++
  src/components/ui/form.tsx                         |  168 +
  src/components/ui/hover-card.tsx                   |   44 +
  src/components/ui/input-otp.tsx                    |   77 +
  src/components/ui/input.tsx                        |   27 +
  src/components/ui/label.tsx                        |   24 +
  src/components/ui/menubar.tsx                      |  276 ++
  src/components/ui/navigation-menu.tsx              |  168 +
  src/components/ui/pagination.tsx                   |  127 +
  src/components/ui/popover.tsx                      |   48 +
  src/components/ui/progress.tsx                     |   31 +
  src/components/ui/radio-group.tsx                  |   45 +
  src/components/ui/resizable.tsx                    |   56 +
  src/components/ui/scroll-area.tsx                  |   58 +
  src/components/ui/select.tsx                       |  189 +
  src/components/ui/separator.tsx                    |   28 +
  src/components/ui/sheet.tsx                        |  139 +
  src/components/ui/sidebar.tsx                      |  726 ++++
  src/components/ui/skeleton.tsx                     |   13 +
  src/components/ui/slider.tsx                       |   63 +
  src/components/ui/sonner.tsx                       |   26 +
  src/components/ui/switch.tsx                       |   31 +
  src/components/ui/table.tsx                        |  116 +
  src/components/ui/tabs.tsx                         |   66 +
  src/components/ui/textarea.tsx                     |   18 +
  src/components/ui/toggle-group.tsx                 |   73 +
  src/components/ui/toggle.tsx                       |   47 +
  src/components/ui/tooltip.tsx                      |   61 +
  src/components/ui/use-mobile.ts                    |   21 +
  src/components/ui/utils.ts                         |    1 +
  src/features/parts/components/PartCard.tsx         |    2 +-
  src/features/parts/components/PartDetailClient.tsx |    2 +-
  src/features/projects/components/ProjectCard.tsx   |    2 +-
  .../projects/components/ProjectDetailClient.tsx    |    2 +-
  src/lib/api/client.ts                              |  329 ++
  tailwind.config.ts                                 |    2 +
  64 files changed, 10161 insertions(+), 347 deletions(-)
  create mode 100644 .github/workflows/create-frontend-integration-issues.yml
  create mode 100644 src/components/AppShell.tsx
  create mode 100644 src/components/DataTable.tsx
  create mode 100644 src/components/StatusBadge.tsx
  delete mode 100644 src/components/ui/Badge.tsx
  create mode 100644 src/components/ui/accordion.tsx
  create mode 100644 src/components/ui/alert-dialog.tsx
  create mode 100644 src/components/ui/alert.tsx
  create mode 100644 src/components/ui/aspect-ratio.tsx
  create mode 100644 src/components/ui/avatar.tsx
  create mode 100644 src/components/ui/badge.tsx
  create mode 100644 src/components/ui/breadcrumb.tsx
  create mode 100644 src/components/ui/button.tsx
  create mode 100644 src/components/ui/calendar.tsx
  create mode 100644 src/components/ui/card.tsx
  create mode 100644 src/components/ui/carousel.tsx
  create mode 100644 src/components/ui/chart.tsx
  create mode 100644 src/components/ui/checkbox.tsx
  create mode 100644 src/components/ui/collapsible.tsx
  create mode 100644 src/components/ui/command.tsx
  create mode 100644 src/components/ui/context-menu.tsx
  create mode 100644 src/components/ui/dialog.tsx
  create mode 100644 src/components/ui/drawer.tsx
  create mode 100644 src/components/ui/dropdown-menu.tsx
  create mode 100644 src/components/ui/form.tsx
  create mode 100644 src/components/ui/hover-card.tsx
  create mode 100644 src/components/ui/input-otp.tsx
  create mode 100644 src/components/ui/input.tsx
  create mode 100644 src/components/ui/label.tsx
  create mode 100644 src/components/ui/menubar.tsx
  create mode 100644 src/components/ui/navigation-menu.tsx
  create mode 100644 src/components/ui/pagination.tsx
  create mode 100644 src/components/ui/popover.tsx
  create mode 100644 src/components/ui/progress.tsx
  create mode 100644 src/components/ui/radio-group.tsx
  create mode 100644 src/components/ui/resizable.tsx
  create mode 100644 src/components/ui/scroll-area.tsx
  create mode 100644 src/components/ui/select.tsx
  create mode 100644 src/components/ui/separator.tsx
  create mode 100644 src/components/ui/sheet.tsx
  create mode 100644 src/components/ui/sidebar.tsx
  create mode 100644 src/components/ui/skeleton.tsx
  create mode 100644 src/components/ui/slider.tsx
  create mode 100644 src/components/ui/sonner.tsx
  create mode 100644 src/components/ui/switch.tsx
  create mode 100644 src/components/ui/table.tsx
  create mode 100644 src/components/ui/tabs.tsx
  create mode 100644 src/components/ui/textarea.tsx
  create mode 100644 src/components/ui/toggle-group.tsx
  create mode 100644 src/components/ui/toggle.tsx
  create mode 100644 src/components/ui/tooltip.tsx
  create mode 100644 src/components/ui/use-mobile.ts
  create mode 100644 src/components/ui/utils.ts
  create mode 100644 src/lib/api/client.ts
  PS C:\Users\black\IdeaProjects\project-inventory> Stop-Process -Id 31984 -Force; Write-Output "Stopped."^C
  PS C:\Users\black\IdeaProjects\project-inventory> npm install && tsc
  At line:1 char:13
+ npm install && tsc
+             ~~
The token '&&' is not a valid statement separator in this version.
+ CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
+ FullyQualifiedErrorId : InvalidEndOfLine

PS C:\Users\black\IdeaProjects\project-inventory> npm install; tsc
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: eslint-plugin-import@2.32.0
npm warn Found: eslint@10.0.3
npm warn node_modules/eslint
npm warn   eslint@"10.0.3" from the root project
npm warn   8 more (@eslint-community/eslint-utils, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9" from eslint-plugin-import@2.32.0
npm warn node_modules/eslint-plugin-import
npm warn   eslint-plugin-import@"^2.32.0" from eslint-config-next@16.1.6
npm warn   node_modules/eslint-config-next
npm warn   1 more (eslint-import-resolver-typescript)
npm warn
npm warn Conflicting peer dependency: eslint@9.39.4
npm warn node_modules/eslint
npm warn   peer eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9" from eslint-plugin-import@2.32.0
npm warn   node_modules/eslint-plugin-import
npm warn     eslint-plugin-import@"^2.32.0" from eslint-config-next@16.1.6
npm warn     node_modules/eslint-config-next
npm warn     1 more (eslint-import-resolver-typescript)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: eslint-plugin-jsx-a11y@6.10.2
npm warn Found: eslint@10.0.3
npm warn node_modules/eslint
npm warn   eslint@"10.0.3" from the root project
npm warn   8 more (@eslint-community/eslint-utils, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" from eslint-plugin-jsx-a11y@6.10.2
npm warn node_modules/eslint-plugin-jsx-a11y
npm warn   eslint-plugin-jsx-a11y@"^6.10.0" from eslint-config-next@16.1.6
npm warn   node_modules/eslint-config-next
npm warn
npm warn Conflicting peer dependency: eslint@9.39.4
npm warn node_modules/eslint
npm warn   peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" from eslint-plugin-jsx-a11y@6.10.2
npm warn   node_modules/eslint-plugin-jsx-a11y
npm warn     eslint-plugin-jsx-a11y@"^6.10.0" from eslint-config-next@16.1.6
npm warn     node_modules/eslint-config-next
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: eslint-plugin-react@7.37.5
npm warn Found: eslint@10.0.3
npm warn node_modules/eslint
npm warn   eslint@"10.0.3" from the root project
npm warn   8 more (@eslint-community/eslint-utils, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7" from eslint-plugin-react@7.37.5
npm warn node_modules/eslint-plugin-react
npm warn   eslint-plugin-react@"^7.37.0" from eslint-config-next@16.1.6
npm warn   node_modules/eslint-config-next
npm warn
npm warn Conflicting peer dependency: eslint@9.39.4
npm warn node_modules/eslint
npm warn   peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7" from eslint-plugin-react@7.37.5
npm warn   node_modules/eslint-plugin-react
npm warn     eslint-plugin-react@"^7.37.0" from eslint-config-next@16.1.6
npm warn     node_modules/eslint-config-next
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: eslint-plugin-react-hooks@7.0.1
npm warn Found: eslint@10.0.3
npm warn node_modules/eslint
npm warn   eslint@"10.0.3" from the root project
npm warn   8 more (@eslint-community/eslint-utils, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer eslint@"^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0" from eslint-plugin-react-hooks@7.0.1
npm warn node_modules/eslint-plugin-react-hooks
npm warn   eslint-plugin-react-hooks@"^7.0.0" from eslint-config-next@16.1.6
npm warn   node_modules/eslint-config-next
npm warn
npm warn Conflicting peer dependency: eslint@9.39.4
npm warn node_modules/eslint
npm warn   peer eslint@"^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0" from eslint-plugin-react-hooks@7.0.1
npm warn   node_modules/eslint-plugin-react-hooks
npm warn     eslint-plugin-react-hooks@"^7.0.0" from eslint-config-next@16.1.6
npm warn     node_modules/eslint-config-next
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: react-day-picker@8.10.1
npm error Found: react@19.2.4
npm error node_modules/react
npm error   react@"19.2.4" from the root project
npm error   peer react@">=16.8.0" from @floating-ui/react-dom@2.1.8
npm error   node_modules/@floating-ui/react-dom
npm error     @floating-ui/react-dom@"^2.0.0" from @radix-ui/react-popper@1.2.8
npm error     node_modules/@radix-ui/react-popper
npm error       @radix-ui/react-popper@"1.2.8" from @radix-ui/react-hover-card@1.1.15
npm error       node_modules/@radix-ui/react-hover-card
npm error         @radix-ui/react-hover-card@"^1.1.15" from the root project
npm error       4 more (@radix-ui/react-menu, @radix-ui/react-popover, ...)
npm error   88 more (@radix-ui/react-accordion, ...)
npm error
npm error Could not resolve dependency:
npm error peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from react-day-picker@8.10.1
npm error node_modules/react-day-picker
npm error   react-day-picker@"^8.10.1" from the root project
npm error
npm error Conflicting peer dependency: react@18.3.1
npm error node_modules/react
npm error   peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from react-day-picker@8.10.1
npm error   node_modules/react-day-picker
npm error     react-day-picker@"^8.10.1" from the root project
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
npm error
npm error
npm error For a full report see:
npm error C:\Users\black\AppData\Local\npm-cache\_logs\2026-03-17T01_34_35_160Z-eresolve-report.txt
npm error A complete log of this run can be found in: C:\Users\black\AppData\Local\npm-cache\_logs\2026-03-17T01_34_35_160Z-debug-0.log
src/app/layout.tsx:3:31 - error TS2307: Cannot find module 'next-themes' or its corresponding type declarations.

3 import { ThemeProvider } from 'next-themes';
~~~~~~~~~~~~~

src/components/AppShell.tsx:14:8 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

14 } from 'lucide-react';
~~~~~~~~~~~~~~

src/components/AppShell.tsx:17:24 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

17 import { Search } from 'lucide-react';
~~~~~~~~~~~~~~

src/components/DataTable.tsx:6:43 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

6 import { ChevronLeft, ChevronRight } from 'lucide-react';
~~~~~~~~~~~~~~

src/components/ui/accordion.tsx:4:37 - error TS2307: Cannot find module '@radix-ui/react-accordion' or its corresponding type declarations.

4 import * as AccordionPrimitive from "@radix-ui/react-accordion";
~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/accordion.tsx:5:33 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { ChevronDownIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/alert-dialog.tsx:4:39 - error TS2307: Cannot find module '@radix-ui/react-alert-dialog' or its corresponding type declarations.

4 import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/alert.tsx:2:40 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

2 import { cva, type VariantProps } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/aspect-ratio.tsx:3:39 - error TS2307: Cannot find module '@radix-ui/react-aspect-ratio' or its corresponding type declarations.

3 import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/avatar.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-avatar' or its corresponding type declarations.

4 import * as AvatarPrimitive from "@radix-ui/react-avatar";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/badge.tsx:2:22 - error TS2307: Cannot find module '@radix-ui/react-slot' or its corresponding type declarations.

2 import { Slot } from "@radix-ui/react-slot";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/badge.tsx:3:40 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

3 import { cva, type VariantProps } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/breadcrumb.tsx:2:22 - error TS2307: Cannot find module '@radix-ui/react-slot' or its corresponding type declarations.

2 import { Slot } from "@radix-ui/react-slot";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/breadcrumb.tsx:3:46 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

3 import { ChevronRight, MoreHorizontal } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/button.tsx:2:22 - error TS2307: Cannot find module '@radix-ui/react-slot' or its corresponding type declarations.

2 import { Slot } from "@radix-ui/react-slot";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/button.tsx:3:40 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

3 import { cva, type VariantProps } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/calendar.tsx:4:43 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

4 import { ChevronLeft, ChevronRight } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/calendar.tsx:5:27 - error TS2307: Cannot find module 'react-day-picker' or its corresponding type declarations.

5 import { DayPicker } from "react-day-picker";
~~~~~~~~~~~~~~~~~~

src/components/ui/calendar.tsx:63:22 - error TS7031: Binding element 'className' implicitly has an 'any' type.

63         IconLeft: ({ className, ...props }) => (
~~~~~~~~~

src/components/ui/calendar.tsx:66:23 - error TS7031: Binding element 'className' implicitly has an 'any' type.

66         IconRight: ({ className, ...props }) => (
~~~~~~~~~

src/components/ui/carousel.tsx:6:8 - error TS2307: Cannot find module 'embla-carousel-react' or its corresponding type declarations.

6 } from "embla-carousel-react";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/carousel.tsx:7:39 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

7 import { ArrowLeft, ArrowRight } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/chart.tsx:4:36 - error TS2307: Cannot find module 'recharts' or its corresponding type declarations.

4 import * as RechartsPrimitive from "recharts";
~~~~~~~~~~

src/components/ui/chart.tsx:182:23 - error TS7006: Parameter 'item' implicitly has an 'any' type.

182         {payload.map((item, index) => {
~~~~

src/components/ui/chart.tsx:182:29 - error TS7006: Parameter 'index' implicitly has an 'any' type.

182         {payload.map((item, index) => {
~~~~~

src/components/ui/chart.tsx:278:21 - error TS7006: Parameter 'item' implicitly has an 'any' type.

278       {payload.map((item) => {
~~~~

src/components/ui/checkbox.tsx:4:36 - error TS2307: Cannot find module '@radix-ui/react-checkbox' or its corresponding type declarations.

4 import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/checkbox.tsx:5:27 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { CheckIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/collapsible.tsx:3:39 - error TS2307: Cannot find module '@radix-ui/react-collapsible' or its corresponding type declarations.

3 import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/command.tsx:4:45 - error TS2307: Cannot find module 'cmdk' or its corresponding type declarations.

4 import { Command as CommandPrimitive } from "cmdk";
~~~~~~

src/components/ui/command.tsx:5:28 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { SearchIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/context-menu.tsx:4:39 - error TS2307: Cannot find module '@radix-ui/react-context-menu' or its corresponding type declarations.

4 import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/context-menu.tsx:5:57 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/dialog.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-dialog' or its corresponding type declarations.

4 import * as DialogPrimitive from "@radix-ui/react-dialog";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/dialog.tsx:5:23 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { XIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/drawer.tsx:4:43 - error TS2307: Cannot find module 'vaul' or its corresponding type declarations.

4 import { Drawer as DrawerPrimitive } from "vaul";
~~~~~~

src/components/ui/dropdown-menu.tsx:4:40 - error TS2307: Cannot find module '@radix-ui/react-dropdown-menu' or its corresponding type declarations.

4 import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/dropdown-menu.tsx:5:57 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/form.tsx:4:33 - error TS2307: Cannot find module '@radix-ui/react-label' or its corresponding type declarations.

4 import * as LabelPrimitive from "@radix-ui/react-label";
~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/form.tsx:5:22 - error TS2307: Cannot find module '@radix-ui/react-slot' or its corresponding type declarations.

5 import { Slot } from "@radix-ui/react-slot";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/form.tsx:14:8 - error TS2307: Cannot find module 'react-hook-form' or its corresponding type declarations.

14 } from "react-hook-form";
~~~~~~~~~~~~~~~~~

src/components/ui/hover-card.tsx:4:37 - error TS2307: Cannot find module '@radix-ui/react-hover-card' or its corresponding type declarations.

4 import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/input-otp.tsx:4:43 - error TS2307: Cannot find module 'input-otp' or its corresponding type declarations.

4 import { OTPInput, OTPInputContext } from "input-otp";
~~~~~~~~~~~

src/components/ui/input-otp.tsx:5:27 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { MinusIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/input-otp.tsx:47:61 - error TS2339: Property 'slots' does not exist on type '{}'.

47   const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};
~~~~~

src/components/ui/label.tsx:4:33 - error TS2307: Cannot find module '@radix-ui/react-label' or its corresponding type declarations.

4 import * as LabelPrimitive from "@radix-ui/react-label";
~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/menubar.tsx:4:35 - error TS2307: Cannot find module '@radix-ui/react-menubar' or its corresponding type declarations.

4 import * as MenubarPrimitive from "@radix-ui/react-menubar";
~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/menubar.tsx:5:57 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/navigation-menu.tsx:2:42 - error TS2307: Cannot find module '@radix-ui/react-navigation-menu' or its corresponding type declarations.

2 import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/navigation-menu.tsx:3:21 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

3 import { cva } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/navigation-menu.tsx:4:33 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

4 import { ChevronDownIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/pagination.tsx:6:8 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

6 } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/pagination.tsx:75:7 - error TS2783: 'size' is specified more than once, so this usage will be overwritten.

75       size="default"
~~~~~~~~~~~~~~

src/components/ui/pagination.tsx:77:7
77       {...props}
~~~~~~~~~~
This spread always overwrites this property.

src/components/ui/pagination.tsx:92:7 - error TS2783: 'size' is specified more than once, so this usage will be overwritten.

92       size="default"
~~~~~~~~~~~~~~

src/components/ui/pagination.tsx:94:7
94       {...props}
~~~~~~~~~~
This spread always overwrites this property.

src/components/ui/popover.tsx:4:35 - error TS2307: Cannot find module '@radix-ui/react-popover' or its corresponding type declarations.

4 import * as PopoverPrimitive from "@radix-ui/react-popover";
~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/progress.tsx:4:36 - error TS2307: Cannot find module '@radix-ui/react-progress' or its corresponding type declarations.

4 import * as ProgressPrimitive from "@radix-ui/react-progress";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/radio-group.tsx:4:38 - error TS2307: Cannot find module '@radix-ui/react-radio-group' or its corresponding type declarations.

4 import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/radio-group.tsx:5:28 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { CircleIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/resizable.tsx:4:34 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

4 import { GripVerticalIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/resizable.tsx:5:37 - error TS2307: Cannot find module 'react-resizable-panels' or its corresponding type declarations.

5 import * as ResizablePrimitive from "react-resizable-panels";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/scroll-area.tsx:4:38 - error TS2307: Cannot find module '@radix-ui/react-scroll-area' or its corresponding type declarations.

4 import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/select.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-select' or its corresponding type declarations.

4 import * as SelectPrimitive from "@radix-ui/react-select";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/select.tsx:9:8 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

9 } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/separator.tsx:4:37 - error TS2307: Cannot find module '@radix-ui/react-separator' or its corresponding type declarations.

4 import * as SeparatorPrimitive from "@radix-ui/react-separator";
~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/sheet.tsx:4:33 - error TS2307: Cannot find module '@radix-ui/react-dialog' or its corresponding type declarations.

4 import * as SheetPrimitive from "@radix-ui/react-dialog";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/sheet.tsx:5:23 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

5 import { XIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/sidebar.tsx:4:22 - error TS2307: Cannot find module '@radix-ui/react-slot' or its corresponding type declarations.

4 import { Slot } from "@radix-ui/react-slot";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/sidebar.tsx:5:35 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

5 import { VariantProps, cva } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/sidebar.tsx:6:31 - error TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

6 import { PanelLeftIcon } from "lucide-react";
~~~~~~~~~~~~~~

src/components/ui/sidebar.tsx:270:17 - error TS7006: Parameter 'event' implicitly has an 'any' type.

270       onClick={(event) => {
~~~~~

src/components/ui/slider.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-slider' or its corresponding type declarations.

4 import * as SliderPrimitive from "@radix-ui/react-slider";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/sonner.tsx:4:26 - error TS2307: Cannot find module 'next-themes' or its corresponding type declarations.

4 import { useTheme } from "next-themes";
~~~~~~~~~~~~~

src/components/ui/sonner.tsx:5:49 - error TS2307: Cannot find module 'sonner' or its corresponding type declarations.

5 import { Toaster as Sonner, ToasterProps } from "sonner";
~~~~~~~~

src/components/ui/switch.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-switch' or its corresponding type declarations.

4 import * as SwitchPrimitive from "@radix-ui/react-switch";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/tabs.tsx:4:32 - error TS2307: Cannot find module '@radix-ui/react-tabs' or its corresponding type declarations.

4 import * as TabsPrimitive from "@radix-ui/react-tabs";
~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/toggle-group.tsx:4:39 - error TS2307: Cannot find module '@radix-ui/react-toggle-group' or its corresponding type declarations.

4 import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/toggle-group.tsx:5:35 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

5 import { type VariantProps } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/toggle.tsx:4:34 - error TS2307: Cannot find module '@radix-ui/react-toggle' or its corresponding type declarations.

4 import * as TogglePrimitive from "@radix-ui/react-toggle";
~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/toggle.tsx:5:40 - error TS2307: Cannot find module 'class-variance-authority' or its corresponding type declarations.

5 import { cva, type VariantProps } from "class-variance-authority";
~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/ui/tooltip.tsx:4:35 - error TS2307: Cannot find module '@radix-ui/react-tooltip' or its corresponding type declarations.

4 import * as TooltipPrimitive from "@radix-ui/react-tooltip";
~~~~~~~~~~~~~~~~~~~~~~~~~


Found 80 errors in 44 files.

Errors  Files
1  src/app/layout.tsx:3
2  src/components/AppShell.tsx:14
1  src/components/DataTable.tsx:6
2  src/components/ui/accordion.tsx:4
1  src/components/ui/alert-dialog.tsx:4
1  src/components/ui/alert.tsx:2
1  src/components/ui/aspect-ratio.tsx:3
1  src/components/ui/avatar.tsx:4
2  src/components/ui/badge.tsx:2
2  src/components/ui/breadcrumb.tsx:2
2  src/components/ui/button.tsx:2
4  src/components/ui/calendar.tsx:4
2  src/components/ui/carousel.tsx:6
4  src/components/ui/chart.tsx:4
2  src/components/ui/checkbox.tsx:4
1  src/components/ui/collapsible.tsx:3
2  src/components/ui/command.tsx:4
2  src/components/ui/context-menu.tsx:4
2  src/components/ui/dialog.tsx:4
1  src/components/ui/drawer.tsx:4
2  src/components/ui/dropdown-menu.tsx:4
3  src/components/ui/form.tsx:4
1  src/components/ui/hover-card.tsx:4
3  src/components/ui/input-otp.tsx:4
1  src/components/ui/label.tsx:4
2  src/components/ui/menubar.tsx:4
3  src/components/ui/navigation-menu.tsx:2
3  src/components/ui/pagination.tsx:6
1  src/components/ui/popover.tsx:4
1  src/components/ui/progress.tsx:4
2  src/components/ui/radio-group.tsx:4
2  src/components/ui/resizable.tsx:4
1  src/components/ui/scroll-area.tsx:4
2  src/components/ui/select.tsx:4
1  src/components/ui/separator.tsx:4
2  src/components/ui/sheet.tsx:4
4  src/components/ui/sidebar.tsx:4
1  src/components/ui/slider.tsx:4
2  src/components/ui/sonner.tsx:4
1  src/components/ui/switch.tsx:4
1  src/components/ui/tabs.tsx:4
2  src/components/ui/toggle-group.tsx:4
2  src/components/ui/toggle.tsx:4
1  src/components/ui/tooltip.tsx:4
PS C:\Users\black\IdeaProjects\project-inventory> 
