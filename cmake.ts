function parseCMake(script) {
  let position = 0;

  let currentChar = () => script.charAt(position);
  let nextChar = () => script.charAt(++position);

  function skipSpace() {
    while (position < script.length) {
      let c = script.charCodeAt(position);
      if (c === 32 || c === 9) {
        position++;
      } else {
        break;
      }
    }
  }

  function skipSpaceNewLine() {
    while (position < script.length) {
      let c = script.charCodeAt(position);
      if (c === 32 || c === 9 || c === 13 || c === 10) {
        position++;
      } else {
        break;
      }
    }
  }

  function runComment() {
    let start = position;
    let c1 = nextChar();
    if (c1 === '[') {
      return runBracketArgument();
    } else {
      let c2 = nextChar();
      while (c2 !== '\n' && c2 !== '')
        c2 = nextChar();
      let str = script.substring(start + 1, position);
      nextChar();
      return str;
    }
  }

  function runBracketArgument() {
    let original = position;
    let equal1 = 0;
    let c2 = nextChar();
    while (c2 === '=') {
      equal1++;
      c2 = nextChar();
    }
    if (c2 !== '[') {
      position = original;
      return '';
    }

    let start = position;
    let c3 = nextChar();
    while (c3 !== '') {
      if (c3 === ']') {
        let equal2 = 0;
        let c4 = nextChar();
        while (c4 === '=') {
          equal2++;
          c4 = nextChar();
        }
        if ((c4 === ']') && (equal1 === equal2)) {
          nextChar();
          return script.substring(start, position - equal2 - 2);
        }
      }
      c3 = nextChar();
    }

    let expected = ']';
    for (let i = 0; i < equal1; i++)
      expected += '=';
    expected += ']';
    throw `bracket close token not found, expected ${expected}, bracket open: ${start}`;
  }

  let isIdentifierStart = c => ((c === '_') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'));

  function runIdentifier() {
    let start = position;
    let c1 = nextChar();
    while ((c1 !== '') && ((c1 >= 'A' && c1 <= 'Z') || (c1 >= 'a' && (c1 <= 'z') || c1 >= '0' && c1 <= '9') || c1 === '_'))
      c1 = nextChar();
    return script.substring(start, position);
  }

  function runQuotedArgument() {
    let start = position;
    let c1 = nextChar();
    while (c1 !== '') {
      if (c1 === '\\') {
        let c2 = nextChar();
        if (c2 === '\r')
          c2 = nextChar();
      }
      else if (c1 === '"') {
        let str = script.substring(start, position);
        nextChar();
        return str;
      }
      c1 = nextChar();
    }
    return script.substring(start);
  }

  let isEndOfUnquotedArgument = c => ((c === ' ') || (c === '\t') || (c === '\r') || (c === '\n') || (c === '(') || (c == ')') || (c == '#') || (c == '"') || (c == '\\'));

  function runUnquotedArgument() {
    let start = position;
    let c1 = currentChar();
    while (c1 !== '') {
      if (c1 === '\\')
        nextChar();
      else if (isEndOfUnquotedArgument(c1))
        return script.substring(start, position);
      c1 = nextChar();
    }
    return script.substring(start);
  }

  function runArguments() {
    let arr = [];
    nextChar();
    skipSpaceNewLine();
    let c1 = currentChar();
    while (c1 !== '') {
      if (c1 === '#')
        runComment();
      else if (c1 === '(')
        arr.push(runArguments());
      else if (c1 === ')') {
        nextChar();
        return arr;
      } else if (c1 === '[')
        runBracketArgument();
      else if (c1 === '"')
        arr.push(runQuotedArgument());
      else
        arr.push(runUnquotedArgument());
      skipSpaceNewLine();
      c1 = currentChar();
    }
    throw "Invalid char " + c1 + ", expected )";
  }

  let statements = [];
  while (position < script.length) {
    skipSpaceNewLine();
    let c = currentChar();
    if (c === '#') {
      statements.push( { type: 1, value: runComment() } );
    } else if (isIdentifierStart(c)) {
      let identifier = runIdentifier();
      skipSpace();
      let bo = currentChar();
      if (bo !== '(')
        throw "Invalid char " + bo + ", expected (";
      let args = runArguments();
      statements.push( { type: 0, command: identifier, args: args } );
    } else if (c !== '') {
      throw "Invalid char " + c;
    }
  }
  return statements;
}

module.exports = parseCMake;
