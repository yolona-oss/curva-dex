//import { SingleThrottler } from "@core/utils/single-throttler";
//
//(async () => {
//    SingleThrottler.Instance.SetThrottleDelay('test', 5000)
//    console.log(`Throttle test. Throttle delay: ${SingleThrottler.Instance.ThrottleDelay('test')}`)
//    while (true) {
//        await SingleThrottler.Instance.throttle('test', async () => {
//            console.log('test')
//            console.log(new Date().toLocaleTimeString("ru"))
//        })
//    }
//})()

//import { genRandomString } from "@core/utils/random"
//import { shorten } from "@core/utils/string"
//
//let str = genRandomString(15)
//console.log(str)
//console.log(str.length)
//for (let i = 6; i < 15; i++) {
//    console.log(shorten(str, i))
//}

import { MBMarupFieldDesigner, TableMBMarkupField } from '@core/ui/command-processor/message-bonder'

let cnstr = new MBMarupFieldDesigner()

const testTableField: TableMBMarkupField = {
    id: 'user-stats-table',
    title: 'User Statistics Report',
    table: {
        header: [
            'Username',
            'Registration Date',
            'Total Orders',
            'Avg. Order Value',
            'Last Purchase',
            'Status',
            'Special Notes'
        ],
        body: [
            [
                'john_doe',
                '2022-03-15',
                '15',
                '$125.50',
                '2023-04-10',
                'Active',
                'Loyal customer with special discount'
            ],
            [
                'jane_smith',
                '2021-11-22',
                '42',
                '$89.99',
                '2023-04-05',
                'VIP',
                'Prefers email communication'
            ],
            [
                'bob_builder',
                '2023-01-05',
                '3',
                '$210.00',
                '2023-03-28',
                'New',
                'First-time buyer, potential for growth'
            ],
            [
                'alice_wonder',
                '2020-07-30',
                '87',
                '$65.75',
                '2023-04-12',
                'Inactive',
                'Hasn\'t purchased in 6 months'
            ],
            [
                'tech_guy',
                '2022-09-14',
                '31',
                '$150.20',
                '2023-04-15',
                'Active',
                'Interested in new product line'
            ]
        ]
    }
};

let out = cnstr.make(testTableField, 30)
console.log(out)
