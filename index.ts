import cheerio from 'cheerio';
import fetch from 'node-fetch';
import HttpProxyAgent from 'https-proxy-agent';
import { DynamoDBClient, PutItemCommand, QueryCommand }
            from '@aws-sdk/client-dynamodb-v2-node';

const TABLENAME = 'logTable';
const PROXY = 'http://aaaa:iiiii@111.111.111.111:11111';
const ENDPOINT = 'https://google.com/'

async function load() {
    const proxy = new HttpProxyAgent(PROXY);
    const page = await fetch(ENDPOINT, {agent: proxy});
    const body = await page.text();
    return body;
}

async function getValue() {
    const body = await load();
    const $ = cheerio.load(body);
    return $('#priceblock_ourprice').text();
}

async function sendNotification(webhook: string, value: string, endpoint: string) {
    const body = {
        username: 'Monitor',
        embeds: [
            {
                title: 'New value detected',
                description: `New value: ${value}`,
                time: new Date().getTime(),
                url: endpoint
            }
        ]
    }
    await fetch(webhook, { method: 'POST', body: JSON.stringify(body) });
}

export async function handler() {
    const client = new DynamoDBClient({ region: 'ap-northeast-1' });
    const value = await getValue();

    // Fetch last value
    const queryCommand = new QueryCommand({
        TableName: TABLENAME,
        Limit: 1,
        ScanIndexForward: false,
    })
    const v = await client.send(queryCommand);
    // Put item
    const putCommand = new PutItemCommand({
        TableName: TABLENAME,
        Item: {value: {S: value}, timestamp: {N: `${new Date().getTime()}`}}
    });
    await client.send(putCommand);
    if (v.Items[0].value !== value) {
        // Notify!
    }
}
