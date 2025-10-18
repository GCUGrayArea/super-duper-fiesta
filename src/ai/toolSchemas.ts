export const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'createRectangle',
      description: 'Create a rectangle',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
          fill: { type: 'string' }
        },
        required: ['x', 'y', 'width', 'height', 'fill']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createCircle',
      description: 'Create a circle',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          radius: { type: 'number' },
          fill: { type: 'string' }
        },
        required: ['x', 'y', 'radius', 'fill']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createText',
      description: 'Create a text object',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          fontSize: { type: 'number' },
          fill: { type: 'string' }
        },
        required: ['text', 'x', 'y', 'fontSize', 'fill']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'moveObject',
      description: 'Move an object to an absolute position',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' }
        },
        required: ['objectId', 'x', 'y']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'resizeObject',
      description: 'Resize an object by width/height (rect/text). For circles, use resizeCircle.',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' }
        },
        required: ['objectId', 'width', 'height']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'resizeCircle',
      description: 'Resize a circle by radius',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          radius: { type: 'number' }
        },
        required: ['objectId', 'radius']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'resizeText',
      description: 'Resize a text object by fontSize',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          fontSize: { type: 'number' }
        },
        required: ['objectId', 'fontSize']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rotateObject',
      description: 'Rotate an object to a specified angle (degrees 0-360)',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          degrees: { type: 'number' }
        },
        required: ['objectId', 'degrees']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteObject',
      description: 'Delete an object from the canvas',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' }
        },
        required: ['objectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'arrangeHorizontal',
      description: 'Arrange objects in a horizontal row with spacing',
      parameters: {
        type: 'object',
        properties: {
          objectIds: { type: 'array', items: { type: 'string' } },
          spacing: { type: 'number' }
        },
        required: ['objectIds', 'spacing']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'arrangeVertical',
      description: 'Arrange objects in a vertical column with spacing',
      parameters: {
        type: 'object',
        properties: {
          objectIds: { type: 'array', items: { type: 'string' } },
          spacing: { type: 'number' }
        },
        required: ['objectIds', 'spacing']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'arrangeGrid',
      description: 'Arrange objects in a grid with optional columns and spacing',
      parameters: {
        type: 'object',
        properties: {
          objectIds: { type: 'array', items: { type: 'string' } },
          cols: { type: 'number' },
          spacing: { type: 'number' }
        },
        required: ['objectIds']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'distributeEvenly',
      description: 'Distribute objects evenly along an axis',
      parameters: {
        type: 'object',
        properties: {
          objectIds: { type: 'array', items: { type: 'string' } },
          axis: { type: 'string', enum: ['horizontal', 'vertical'] }
        },
        required: ['objectIds', 'axis']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCanvasState',
      description: 'Return current canvas objects',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getObjectsByDescription',
      description: 'Select objects by natural-language description',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' }
        },
        required: ['description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getViewportCenter',
      description: 'Return current viewport center',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'undoLastCommand',
      description: 'Undo the last AI command',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'undoLastNCommands',
      description: 'Undo the last N AI commands',
      parameters: {
        type: 'object',
        properties: { n: { type: 'number' } },
        required: ['n']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCommandHistory',
      description: 'Return recent AI command history',
      parameters: {
        type: 'object',
        properties: { n: { type: 'number' } },
        required: []
      }
    }
  }
];


