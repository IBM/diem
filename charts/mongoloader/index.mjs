import mongoose from 'mongoose';
import fs from 'fs';

const connection = mongoose.connection;

const uploadforms = async (coll) => {

    const collection = await connection.db.collection(coll);

    const doc_count = await collection.countDocuments();

    console.info(`$at ${coll} - checking document count: ${doc_count}`);

    if (doc_count > 0) {
        const drop_result = await collection.drop().catch((err) => {
            console.error(`$at ${coll} - dropping documents:`, err);
            return Promise.reject();
        });
        console.log(`$at ${coll} - confirming dropping documents`, drop_result);
    }

    const forms = await fs.readFileSync(`./data/${coll}.json`);

    if (!forms) {
        console.error(`$at ${coll} - loading documents: cannot load forms`);
    }


    const insert_result = await collection.insertMany(JSON.parse(forms)).catch((err) => {
        console.error(`$at ${coll} - inserting documents:`, err);
        return Promise.reject();
    });


    console.log(`$at ${coll} - confirming insert:`, insert_result.result);

    await collection.find({}).forEach((doc) => {
        console.log(`$at ${coll} - verifying document: ${doc._id}`);
    });

    console.log(`$at ${coll} - completed sequence`);

    return Promise.resolve(true);
};


const start = () => {

    console.log('$at start: starting...');

    const uri = process.env.MONGO__URL || 'mongodb://diemadmin:diempassword@diem-mongodb:27017/ibmclouddb';
    const options = { useNewUrlParser: true, useUnifiedTopology: true };

    mongoose.connect(uri, options).catch(async (err) => {
        console.error('$at connect:', err);
    });

    connection.on('open', async () => {
        console.log('$at open: connected to mongo server.');
        //trying to get collection names

        const colls = ["forms", "orgs", "profiles", "users"];

        try {
            for (const coll of colls) {
                await uploadforms(coll);
            }
        } catch (err) {
            console.error('$at sequence:', err);
            process.exit();
        }

        process.exit();

    });

    connection.on('error', (err) => {
        console.error('$at error: Error connecting to mongo', err);
        process.exit();
    });
};

start();