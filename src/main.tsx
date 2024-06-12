import React, {useEffect, useState} from 'react'

import './index.css'
import {
    Column,
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    Row,
    RowData,
    useReactTable,
} from '@tanstack/react-table'
import {useVirtualizer} from '@tanstack/react-virtual'
import {makeData, Person} from './makeData'

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        filterVariant?: 'text' | 'range' | 'select'
    }
}

const columns: ColumnDef<Person>[] =
    [
        {
            accessorKey: 'id',
            header: 'ID'
        },
        {
            accessorKey: 'firstName',
            cell: info => info.getValue(),
            header: "First Name"
        },
        {
            accessorFn: row => row.lastName,
            id: 'lastName',
            cell: info => info.getValue(),
            header: 'Last Name',
        },
        {
            accessorKey: 'age',
            header: 'Age',
            meta: {
                filterVariant: "range"
            }
        },
        {
            accessorKey: 'visits',
            header: 'Visits',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            meta: {
                filterVariant: "select"
            }
        },
        {
            accessorKey: 'progress',
            header: 'Profile Progress',
        },
        {
            accessorKey: 'createdAt',
            header: 'Created At',
            cell: info => info.getValue<Date>().toLocaleString(),
        },
    ];

function App() {
    const [data] = React.useState(() => makeData(1_000));
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        filterFns: {},
        state: {
            columnFilters,
        },
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
    })

    const {rows} = table.getRowModel()
    const tableContainerRef = React.useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        estimateSize: () => 10,
        getScrollElement: () => tableContainerRef.current,
        measureElement:
            typeof window !== 'undefined' &&
            navigator.userAgent.indexOf('Firefox') === -1
                ? element => element?.getBoundingClientRect().height
                : undefined,
        overscan: 5,
    });

    const [filters, setFilters] = useState<any>([]);

    useEffect(() => {
        if (filters.length === 0) {
            const filterArray: any[] = [];
            table.getHeaderGroups().forEach(headerGroup => {
                headerGroup.headers.forEach(header => {
                    if (header.column.getCanFilter()) {
                        filterArray.push(
                            <div key={header.id}>
                                <span>{columns[header.index].header?.toString()}: </span>
                                <Filter column={header.column}/>
                            </div>
                        );
                    }
                });
            });
            setFilters(filterArray);
        }
    }, [columns, filters, table]);

    return (
        <div className="app">
            <div style={{display: "flex", justifyContent: "space-between"}}>
                {filters}
            </div>
            <div
                className="container"
                ref={tableContainerRef}
                style={{
                    overflow: 'auto',
                    position: 'relative',
                    height: '50vh',
                }}>
                <table style={{display: 'grid'}}>
                    <thead
                        style={{
                            display: 'grid',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1
                        }}>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr
                            key={headerGroup.id}
                            style={{display: 'flex'}}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th
                                        key={header.id}
                                        style={{
                                            display: 'flex',
                                            width: "12.5%",
                                            minWidth: 100
                                        }}>
                                        <div>
                                            <div
                                                {...{
                                                    className: header.column.getCanSort()
                                                        ? 'cursor-pointer'
                                                        : '',
                                                    onClick: header.column.getToggleSortingHandler(),
                                                }}>
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {{
                                                    asc: <span>   &#8593;</span>,
                                                    desc: <span>   &#8595;</span>,
                                                }[header.column.getIsSorted() as string] ?? null}
                                            </div>
                                        </div>

                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                    </thead>
                    <tbody
                        style={{
                            display: 'grid',
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            position: 'relative',
                        }}>
                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                        const row = rows[virtualRow.index] as Row<Person>
                        return (
                            <tr
                                data-index={virtualRow.index} //needed for dynamic row height measurement
                                ref={node => rowVirtualizer.measureElement(node)} //measure dynamic row height
                                key={row.id}
                                style={{
                                    display: 'flex',
                                    position: 'absolute',
                                    transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                                    width: '100%',
                                }}>
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <td
                                            key={cell.id}
                                            style={{
                                                display: 'flex',
                                                width: "12.5%"
                                            }}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>

            {JSON.stringify(
                {columnFilters: table.getState().columnFilters},
                null,
                2
            )}
        </div>
    )
}

function Filter({column}: { column: Column<any> }) {
    const columnFilterValue = column.getFilterValue()
    const {filterVariant} = column.columnDef.meta ?? {}

    return filterVariant === 'range' ? (
        <div>
            <div className="flex space-x-2">
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[0] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old: [number, number]) => [value, old?.[1]])
                    }
                    placeholder={`Min`}
                    className="w-24 border shadow rounded"
                />
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old: [number, number]) => [old?.[0], value])
                    }
                    placeholder={`Max`}
                    className="w-24 border shadow rounded"
                />
            </div>
            <div className="h-1"/>
        </div>
    ) : filterVariant === 'select' ? (
        <select
            onChange={e => column.setFilterValue(e.target.value)}
            value={columnFilterValue?.toString()}
        >
            <option value="">All</option>
            <option value="complicated">complicated</option>
            <option value="relationship">relationship</option>
            <option value="single">single</option>
        </select>
    ) : (
        <DebouncedInput
            className="w-36 border shadow rounded"
            onChange={value => column.setFilterValue(value)}
            placeholder={`Search...`}
            type="text"
            value={(columnFilterValue ?? '') as string}
        />
    )
}

// A typical debounced input react component
function DebouncedInput({
                            value: initialValue,
                            onChange,
                            debounce = 500,
                            ...props
                        }: {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [value, setValue] = React.useState(initialValue)

    React.useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value)
        }, debounce)

        return () => clearTimeout(timeout)
    }, [value])

    return (
        <input {...props} value={value} onChange={e => setValue(e.target.value)}/>
    )
}

export default App;