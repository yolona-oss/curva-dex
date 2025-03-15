import log from "@core/application/logger"

export type CBTokenType = 'TEXT' | 'SINGLE_DASH' | 'DOUBLE_DASH' // | 'EOF' - only incremental reading not need EOF

const DASHES = ['-', '—']

export type CBLexerToken = {
    type: CBTokenType,
    value?: string
}

export interface CB_ASTNode {
    type: string
    value?: string
    children?: CB_ASTNode[]
}

export class Lexer {
    private input: string
    private pos: number = 0
    private currentChar: string | null

    constructor() {
        this.input = ''
        this.pos = 0
        this.currentChar = null
    }

    public setInput(input: string): void {
        log.trace(`Lexer: New input: ${input}`)
        this.input = input
        this.pos = 0
        this.currentChar = this.input[this.pos]
    }

    private advance(): void {
        this.pos++
        this.currentChar = this.pos < this.input.length ? this.input[this.pos] : null
    }

    private skipWhitespace(): void {
        while (this.currentChar !== null && /\s/.test(this.currentChar)) {
            this.advance()
        }
    }

    private text(): CBLexerToken {
        log.trace(`Lexer: reading text`)
        let result = ''
        while (this.currentChar !== null && !/\s/.test(this.currentChar)) {
            if (this.currentChar === '\\') {
                this.advance(); // Skip the escape character
                if (this.currentChar !== null) {
                    result += this.currentChar
                    this.advance()
                }
            } else if (this.currentChar === '"' || this.currentChar === "'") {
                const quote = this.currentChar
                this.advance(); // Skip the opening quote
                while (this.currentChar !== null && this.currentChar !== quote) {
                    result += this.currentChar
                    this.advance()
                }
                this.advance(); // Skip the closing quote
            } else {
                result += this.currentChar
                this.advance()
            }
        }
        return { type: 'TEXT', value: result }
    }

    private dash(): CBLexerToken {
        log.trace(`Lexer: reading dash`)
        if (DASHES.includes(this.currentChar!) && DASHES.includes(this.input[this.pos + 1])) {
            log.trace(`Lexer: reading double dash`)
            this.advance(); // Skip the first dash
            this.advance(); // Skip the second dash
            let result = ''
            while (this.currentChar !== null && !/\s/.test(this.currentChar)) {
                result += this.currentChar
                this.advance()
            }
            return { type: 'DOUBLE_DASH', value: result }
        } else if (DASHES.includes(this.currentChar!)) {
            log.trace(`Lexer: reading single dash`)
            this.advance(); // Skip the dash
            let result = ''
            while (this.currentChar !== null && !/\s/.test(this.currentChar)) {
                result += this.currentChar
                this.advance()
            }
            return { type: 'SINGLE_DASH', value: result }
        }
        throw new Error('Unexpected character after dash')
    }

    public getNextToken(): CBLexerToken | null {
        if (this.currentChar === null) {
            return null; // No more tokens
        }
        if (/\s/.test(this.currentChar)) {
            console.log(this.currentChar, "ws")
            this.skipWhitespace()
        }

        if (this.currentChar === null) {
            return null; // No more tokens after skipping whitespace
        }

        if (DASHES.includes(this.currentChar!)) {
            return this.dash()
        }

        return this.text()
    }
}
