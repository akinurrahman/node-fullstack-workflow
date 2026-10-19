# Control sizes

Which control carries which height. The touch target rule is in `SKILL.md`.

Form controls and the default `Button` are `h-10 sm:h-9`, so a button beside
an input lines up: `Input`, select and combobox triggers, `DatePicker`, the
filter controls, and the `default` `Button` (there is no text `lg`), plus
`icon-lg` (`size-10 sm:size-9`) for an icon button beside them. Compact
controls are 32px from `sm`: `Button` sizes `xs` and `sm`, the icon sizes
`icon`, `icon-xs` and `icon-sm` (`size-10 sm:size-8`), and menu, select and
combobox items. All of them carry this already, so pick a `size` and add no
height of your own.
