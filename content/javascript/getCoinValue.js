const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;
const dr = app.plugins.getPlugin('obsidian-dice-roller').api;
const gemPortionBind = mb.parseBindTarget(`memory^gemPortion`, context.file.path);
const challengeRatingBind  = mb.parseBindTarget(`memory^challengeRating`, context.file.path)
const deflationRatingBind = mb.parseBindTarget(`frontmatter^loot-generator-deflation-rating`, context.file.path)
const gemDivisionRatingBind = mb.parseBindTarget(`frontmatter^loot-generator-gem-division-rating`, context.file.path)
const gemDivisionRating = mb.getMetadata(gemDivisionRatingBind);
const finalLootBind = mb.parseBindTarget(`frontmatter^loot_generator_final_loot`, context.file.path);

const valueToTier = {
	1000:  1,
	5000: 2,
	10000: 3,
	50000: 4,
	1000000: 5,
	500000: 6,
};
const tierToValue = {
	1: 1000,
	2: 5000,
	3: 10000,
	4: 50000,
	5: 1000000,
	6: 500000,
};

const qualityTierToAdjective = {
	'2': "~~Тусклый~~",
	'1': "_Необработанный_",
	'0': " ",
	'-1': "**Чистый**",
	'-2': "==Превосходный=="

}

	async function getRollerValue(dice) {
		const roller = await dr.getRoller(dice);
		const result = await roller.roll();
		return result;
	}


async function getTotalTreasureCopperValue() {

	// get challenge rating
	let challengeRating = mb.getMetadata(challengeRatingBind);
	let challengeRatingFork = 0;
	if (challengeRating <= 4) {
		challengeRatingFork = 1;
	} else if (challengeRating <= 10) {
		challengeRatingFork = 2;
	} else if (challengeRating <= 16) {
		challengeRatingFork = 3;
	} else {
		challengeRatingFork = 4;
	}

	// generate coin value

	let copperValue = 0;
	let silverValue = 0;
	let goldValue = 0;
	let platinumValue = 0;

	switch (challengeRatingFork) {
		case 1:
			copperValue = await getRollerValue('6d6');
			silverValue = await getRollerValue('3d6');
			goldValue = await getRollerValue('2d6') ;
			copperValue *= 100;
			silverValue *= 100;
			goldValue *= 10;

			break;

		default:
			break;
	}
	const totalValueInCopper = copperValue + silverValue * 10 + goldValue * 100 + platinumValue * 1000
	let fixedForIndividual;
	if ((challengeRating) && challengeRating != 0) {
		const deflationRating = mb.getMetadata(deflationRatingBind);
		fixedForIndividual = Math.floor(totalValueInCopper * (challengeRating * 4) / deflationRating);
	} else {
		fixedForIndividual = "challengeRating not specified!";
	}

	let totalTreasureCopperValue = mb.parseBindTarget(`memory^totalTreasureCopperValue`, context.file.path);
	mb.setMetadata(totalTreasureCopperValue, fixedForIndividual);
	return totalTreasureCopperValue


}

function generateGemPortion() {
	const gemPortionValue = Math.floor( Math.random() * 75 / 100);
	//mb.setMetadata(gemPortion, gemPortionValue);
    return gemPortionValue
}


function splitCoinValue(gemPortion, totalTreasureCopperValue) {

	// split into gem part and coin part
	let gemValue = totalTreasureCopperValue * gemPortion;
	gemValue /= 100;
	gemValue = Math.floor(gemValue);
	gemValue *= 100;
	coinCopperValue = totalTreasureCopperValue - gemValue;
	return {gemValue, coinCopperValue}
}

async function getGemDescription(gemValue) {
	if (!gemValue) return
	let gemTier = valueToTier[gemValue];

	const tierRoller = await dr.getArrayRoller([-2, -1, 0, 0, 0, 1, 2], 1);
	await tierRoller.roll();
	let tierFix =  await tierRoller.results[0];
	let fixedTier = gemTier;
	if (tierFix)
		fixedTier += tierFix;

	if (fixedTier === -1 || fixedTier === 0) {
		fixedTier = 1;
		tierFix = 0;
	}
	if (fixedTier === 7 || fixedTier === 8) {
		fixedTier = 6;
		tierFix = 0;
	}
	fixedTier = parseInt(fixedTier);

	const tableIdentifier = `gemsTier${fixedTier}`
	const tableRoller = dr.getRoller(`[[Mechanics/treasure#^${tableIdentifier}]]`)
	let foundValidAnswer = false;
	while (!foundValidAnswer){
		await tableRoller.roll()
		const tableRollerResult = tableRoller.result;
		const row = tableRollerResult.split('|')
		if (tableRollerResult.search('-----') != -1 || !row[1])
			continue
		foundValidAnswer = true;
		let colors = [];
		let randomColorIndex = -3
		let randomColor = "";
		if (row.length > 2){
			colors = row[2].split(',')
			randomColorIndex = Math.floor((Math.random() * colors.length) - 0.1)
			randomColor = `${colors[randomColorIndex]} `
		} 
		let qualityAdjective = '(Обычный)';
		if (tierFix) qualityAdjective = qualityTierToAdjective[tierFix];
		const outp = `${qualityAdjective} ${randomColor}${row[1]} (${tierToValue[gemTier] / 100} зм)`
		// console.log(`index: ${randomColorIndex} color: ${randomColor} ${outp}`)
		return outp
	}
	

}


async function splitIntoSmallerGems(gemValue) {
	if (!gemDivisionRating) throw( new Error('gemDivisionRating not specified!'))

	const gemTier = valueToTier[gemValue];
	let gemList = [];
	if (!gemTier) { return [] };
	if (gemTier === 1) {
		gemList.push(gemValue);
		return gemList;
	}

	const splitRollValue = await getRollerValue('1d100');
	if (splitRollValue > gemDivisionRating) {
		gemList.push(gemValue);
		return gemList;
	}

	const newGemsValue = tierToValue[gemTier-1];
	let oldGemValue = gemValue;
	let newIndivGemValues = [];

	while (oldGemValue > 0) {
		newIndivGemValues.push(newGemsValue);
		oldGemValue -= newGemsValue;
	}
	for (let i = 0; i < newIndivGemValues.length; i++) {
		const gemValue = newIndivGemValues[i];
		gemList =  gemList.concat( await splitIntoSmallerGems(gemValue));
	}
	return gemList;



}

async function splitGemValue(totalGemValue) {
	let runningGemValue = totalGemValue;
	let gemValuesList = [];
	while (runningGemValue > 0) {
		if (runningGemValue - tierToValue[6] > 0) {
			gemValuesList.push(tierToValue[6]);
			runningGemValue -= tierToValue[6];
			continue;
		}
		if (runningGemValue - tierToValue[5] > 0) {
			gemValuesList.push(tierToValue[5]);
			runningGemValue -= tierToValue[5];
			continue;
		}
		if (runningGemValue - tierToValue[4] > 0) {
			gemValuesList.push(tierToValue[4]);
			runningGemValue -= tierToValue[4];
			continue;
		}
		if (runningGemValue - tierToValue[3] > 0) {
			gemValuesList.push(tierToValue[3]);
			runningGemValue -= tierToValue[3];
			continue;
		}
		if (runningGemValue - tierToValue[2] > 0) {
			gemValuesList.push(tierToValue[2]);
			runningGemValue -= tierToValue[2];
			continue;
		}
		if (runningGemValue - tierToValue[1] > 0) {
			gemValuesList.push(tierToValue[1]);
			runningGemValue -= tierToValue[1];
			continue;
		}
		break;
	}
	let fixedValuesList = [];
	for (let i = 0; i < gemValuesList.length; i++) {
		const gemValue = gemValuesList[i];
		const newValues = await splitIntoSmallerGems(gemValue)
		fixedValuesList =  fixedValuesList.concat(newValues);
	}
	let totalSum = 0;
	for (let i = 0; i < fixedValuesList.length; i++) {
		const value = fixedValuesList[i];
		totalSum += value;
	}
	return fixedValuesList;



}

async function translateValuesToDescriptions(valueList) {
	let outp = [];
	for (let i = 0; i < valueList.length; i++) {
		const value = valueList[i];
		const desc = await getGemDescription(value)
		outp.push(desc)
	}
	return outp
}



const totalTreasureCopperValue = await getTotalTreasureCopperValue();

const gemPortion = generateGemPortion();

const values = splitCoinValue(totalTreasureCopperValue);

// generate list of gem values

// add leftovers from gem values to coin part



// from gem values to coin part

const gemValues = await splitGemValue(100300);
gemDesctiprions = await translateValuesToDescriptions(gemValues)
mb.setMetadata(finalLootBind, gemDesctiprions)



