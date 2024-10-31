import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      values: [
        { name: 'Dark', value: '#333' }
      ]
    },
    options: {
      storySort: {
        order: ['components', ['common', 'svg', 'content', 'dashboard'], 'pages']
      }
    }
  },
};

export default preview;
