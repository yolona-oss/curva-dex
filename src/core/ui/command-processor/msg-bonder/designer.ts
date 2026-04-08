import { deepClone } from "@core/utils/object";
import { shorten } from "@core/utils/string";

import {
    AbstractMBMarkupField,
    TableMBMarkupField,
    TextMBMarkupField
} from "./field-types";

/*
  #############################################################
  # DISCLAIMER!! !!CAUTION!! HAZARD AT YOUR DOOR!!            #
  # AI generated :) VIBE CODE :D (:-(some changes was added ) #
  #############################################################
*/
export class MBMarupFieldDesigner {
    private constructTable(field: TableMBMarkupField, maxWidth: number): string {
        let { table } = deepClone(field)
        let str = ''

        // Calculate column widths (including padding)
        const columnWidths = table.header.map((_, colIndex) => {
            const headerWidth = table.header[colIndex].length
            const maxCellWidth = table.body.reduce((max, row) => {
                const cellWidth = (row[colIndex] || '').length
                return Math.max(max, cellWidth)
            }, 0)
            return Math.max(headerWidth, maxCellWidth) + 2 // +2 for padding (1 space each side)
        })

        // Determine how many columns can fit in maxWidth
        let currentWidth = 0
        const columnGroups: number[][] = []
        let currentGroup: number[] = []

        for (let i = 0; i < columnWidths.length; i++) {
            if (currentWidth + columnWidths[i] > maxWidth) {
                if (currentGroup.length > 0) {
                    columnGroups.push(currentGroup)
                    currentGroup = []
                    currentWidth = 0
                    i-- // Re-try current column in new group
                } else {
                    // Single column is wider than maxWidth - force it anyway
                    currentGroup.push(i)
                    columnGroups.push(currentGroup)
                    currentGroup = []
                    currentWidth = 0
                }
            } else {
                currentGroup.push(i)
                currentWidth += columnWidths[i]
            }
        }

        if (currentGroup.length > 0) {
            columnGroups.push(currentGroup)
        }

        // Build each column group
        for (const group of columnGroups) {
            // Build header
            const headerCells = group.map(colIndex => {
                const width = columnWidths[colIndex] - 2 // Remove padding
                return ` ${table.header[colIndex].padEnd(width, ' ')} `
            })
            str += headerCells.join('') + '\n'

            // Build separator
            const separator = group.map(colIndex => {
                return '-'.repeat(columnWidths[colIndex])
            })
            str += separator.join('') + '\n'

            // Build body rows
            for (const row of table.body) {
                const rowCells: string[][] = []
                let maxCellLines = 1

                // First pass: split cells into lines and find max lines for this row
                for (const colIndex of group) {
                    const cellContent = row[colIndex] || ''
                    const cellWidth = columnWidths[colIndex] - 2 // Remove padding
                    const cellLines: string[] = []

                    // Split cell content into multiple lines if needed
                    for (let i = 0; i < cellContent.length; i += cellWidth) {
                        const line = cellContent.slice(i, i + cellWidth)
                        cellLines.push(line.padEnd(cellWidth, ' '))
                    }

                    rowCells.push(cellLines)
                    maxCellLines = Math.max(maxCellLines, cellLines.length)
                }

                // Second pass: build each line of the row
                for (let lineIndex = 0; lineIndex < maxCellLines; lineIndex++) {
                    const lineParts = group.map((_, groupIndex) => {
                        const cellLines = rowCells[groupIndex]
                        const line = lineIndex < cellLines.length 
                            ? cellLines[lineIndex] 
                            : ' '.repeat(columnWidths[group[groupIndex]] - 2)
                        return ` ${line} `
                    })
                    str += lineParts.join('') + '\n'
                }
            }

            str += '\n'; // Add extra space between column groups
        }

        return str
    }

    private constructText(field: TextMBMarkupField, maxWidth: number): string {
        let str = ''
        for (let i = 0; i < field.text.length; i+= maxWidth) {
            str += field.text.slice(i, i + maxWidth)
        }
        return str
    }

    make(field: AbstractMBMarkupField, maxWidth: number): string {
        let str = field.title.length > 0 ? `${shorten(field.title, maxWidth)}\n` : ''
        if ('table' in field) {
            return str + this.constructTable(field as TableMBMarkupField, maxWidth)
        } else if ('text' in field) {
            return str + this.constructText(field as TextMBMarkupField, maxWidth)
        }
        throw new Error('Unknown field type')
    }
}
