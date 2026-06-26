import React from 'react';

export default function parse(htmlString: string, options?: any) {
  return React.createElement('span', {
    dangerouslySetInnerHTML: { __html: htmlString }
  });
}

export type HTMLReactParserOptions = any;
