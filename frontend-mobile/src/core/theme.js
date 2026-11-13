import { mergeThemeOverrides, createTheme } from '@mantine/core';
import { mantineTheme } from '@core/upstream';

// Upstream palette/colors + touch-friendly defaults.
export default mergeThemeOverrides(
  mantineTheme,
  createTheme({
    cursorType: 'pointer',
    components: {
      Modal: { defaultProps: { centered: true, zIndex: 400 } },
      Menu: { defaultProps: { zIndex: 500 } },
      Popover: { defaultProps: { zIndex: 500 } },
      Select: { defaultProps: { comboboxProps: { zIndex: 600 } } },
      MultiSelect: { defaultProps: { comboboxProps: { zIndex: 600 } } },
      Tooltip: { defaultProps: { events: { hover: true, focus: false, touch: false } } },
    },
  })
);
