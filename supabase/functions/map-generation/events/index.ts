const events=new globalThis.EventManager();for await(const event of events)if(event)console.log(JSON.stringify(event));
