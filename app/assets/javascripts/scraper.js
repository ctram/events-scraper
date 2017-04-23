'use strict'

let yaml = require('js-yaml');
let fs = require('fs');
let Scraperjs = require('scraperjs')
let _ = require('underscore')

function parseTemplates(filePath) {
  let file = fs.readFileSync(filePath, 'utf8')
  let templates = []
  yaml.safeLoadAll(file, template => {
    templates.push(template)
  })
  return templates
}

/**
 * @function scrapeTemplates
 * @param {Array} templates
 */
function scrapeTemplates(templates) {
  let promises = []
  templates.forEach(template => {
    promises.push(scrapeTemplate(template))
  })

  return Promise.all(promises)
    .then(collections => {
      return collections
    })
}

/**
 * @function scrapeTemplate
 * @param {Object} template
 * @return {Promise} scarperjs promise. Resolves after http request is finished
 * and events have been scraped.
 */
function scrapeTemplate(template) {
  let labelsAndSelectors = getLabelsAndSelectors(template)

  let scraperPromise = Scraperjs.StaticScraper
    .create()
    .request({
      headers: {
        'User-Agent': 'request'
      },
      url: template.url
    })
    .scrape($ => {
      return scrapeEvents($, labelsAndSelectors)
    })

  return scraperPromise
}

/**
 * @function getLabelsAndSelectors
 * @param {Object} template
 * @return {Object} Label and CSS selector pairs.
 */
function getLabelsAndSelectors(template) {
  let obj = {}

  for (let key in template) {
    if (key.indexOf('selector') !== -1) {
      let selector = template[key]
      let label = key.split(' ')[1]
      obj[label] = selector
    }
  }

  return obj
}

/**
 * @function scrapeEvents
 * @param {jQuery DOM} $
 * @param {*} labelsAndSelectors
 * @return {Array} Collection of events and their details; Objects of label
 * and text content.
 */
function scrapeEvents($, labelsAndSelectors) {
  let eventSelector = labelsAndSelectors.event
  labelsAndSelectors = _(labelsAndSelectors).clone()
  delete labelsAndSelectors['event']

  return $(eventSelector).map(function() {
    return scrapeEvent($(this), labelsAndSelectors)
  })
}

/**
 * @function scrapeEvent
 * @param {jQuery DOM} $
 * @param {Object} labelsAndSelectors
 * @return {Object} Containing label and associated text.
 */
function scrapeEvent($dom, labelsAndSelectors) {
  let obj = {}


  for (let label in labelsAndSelectors) {

    obj[label] = $dom.find(labelsAndSelectors[label]).text()
  }

  return obj
}

let templates = parseTemplates('./templates.yaml')

scrapeTemplates(templates)
  .then(collections => {
    console.log(collections)
  })
