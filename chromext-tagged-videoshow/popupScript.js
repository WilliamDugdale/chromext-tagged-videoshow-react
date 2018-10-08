  setupPopup();
 
  function sendTagsToCallback(callback)
  {
    chrome.bookmarks.search('video_tags', function (tagsNode) {
      if (tagsNode.length === 0)
      {
        displayMultiboxTitle('No tags');
        callback([]);
      }
      else if (tagsNode.length > 1)
      {
        displayMultiboxTitle('Please ensure you only have one bookmark folder called "video_tags".');
      }
      else
      {
        chrome.bookmarks.getSubTree(tagsNode[0].id, 
          function(bookmarkTreeNodes) {
            tags = bookmarkTreeNodes[0].children.filter(item => !item.url);
            callback(tags);
          });
      }
    });
  }

  function displayMultiboxTitle(message)
  {
    let errorDiv = document.getElementById('multibox');
    clearDOMNode(errorDiv);
    let errorPara = document.createElement('p');
    errorPara.innerHTML = message;
    errorDiv.appendChild(errorPara);
  }

  function displayMultiboxInput(placeholderText, updateEvent)
  {
    let inputDiv = document.getElementById('multibox');
    clearDOMNode(inputDiv);
    let tagFilterInput = document.createElement('input');
    tagFilterInput.placeholder = placeholderText;
    tagFilterInput.id = "tagFilterInput";
    tagFilterInput.addEventListener('keyup', function (event) {
      updateEvent();
    });
    inputDiv.appendChild(tagFilterInput);
    focusToFilterInput();
  }

  function addCheckboxAwarenessToTag(tag)
  {
    tag.checked = 0;
    return tag;
  }

  function activeDivToBrowseMode(tags)
  {
    checkboxAwareTags = tags.map(addCheckboxAwarenessToTag);
    updateMultibox(checkboxAwareTags, 'Choose tags', filterTagsFactory(checkboxAwareTags, filterCheckboxes));
    populateBrowseTagChoices(checkboxAwareTags);
  }

  function checkboxShouldBeHidden(helper, titleArray)
  {
    return ((! titleArray.includes(helper.checkbox.value))
      || helper.container.reservedLabel.reservedAvailableCount === 0)
      && helper.checkbox.checked === false;
  }

  function resetCheckboxes()
  {
    let checkboxes = getAllCheckboxes()
    checkboxes.forEach(checkbox => checkbox.checked = false);
  }

  function filterCheckboxes(filteredTags)
  {
    let titleArray = generateTitleArrayFromTags(filteredTags);
    let checkboxContainerHelpers = getCheckboxContainerHelpers(getAllCheckboxes);
    checkboxContainerHelpers.forEach(function (helper) {
      if (checkboxShouldBeHidden(helper, titleArray))
      {
        helper.container.hidden = true;
      }
      else
      {
        helper.container.hidden = false;
      }
    });
  }

  function generateTitleArrayFromTags(tags)
  {
    return tags.map(item => item.title);
  }

  function getCheckboxContainerHelpers(typedCheckboxFetcher)
  {
    return typedCheckboxFetcher().map(item => ({
      checkbox: item,
      container: getCheckboxContainer(item)
    }));
  }

  function getCheckboxContainer(checkbox)
  {
    return checkbox.parentNode.parentNode;
  }

  function populateBrowseTagChoices(tags)
  {
    let buttonDiv = document.getElementById('buttonDiv');
    clearDOMNode(buttonDiv);
    let actionDiv = document.getElementById('actionDiv');
    clearDOMNode(actionDiv);
    insertButtons(buttonDiv, tags);
    tagsToCheckboxes(actionDiv, tags, updateCheckboxDependentBrowseComponentsFactory(tags), quickClickToSlideshow)
  }

  function updateCheckboxDependentBrowseComponentsFactory(tags)
  {
    return function () {
      updateCheckboxDependentBrowseComponents(tags);
    }
  }

  function updateCheckboxDependentBrowseComponents(tags)
  {
    updateGoButtonCount();
    updateCheckboxAvailabilitiesCountIfNecessary(tags);
    filterTags(tags, filterCheckboxes);
    focusToFilterInput();
  }

  function updateCheckboxAvailabilitiesCountIfNecessary(tags)
  {
    let tagTitlesArray = getCheckedTagTitles();
    let mode = document.getElementById('modeButton').mode;
    if (tagTitlesArray.length > 0)
    {
      updateCheckboxAvailabilitiesCount(tags, tagTitlesArray)
    }
    else
    {
      let checkboxContainerHelpers = getCheckboxContainerHelpers(getAllCheckboxes);
      checkboxContainerHelpers.forEach(function (containerHelper) {
        updateCheckboxAvailableCount(containerHelper, containerHelper.container.reservedLabel.reservedNaturalTotal);
      });
    }
  }

  function updateCheckboxAvailableCount(checkboxHelper, count, currentSelectionCount = 0)
  {
    let text = count;
    let availableCount = count;
    if (unionMode())
    {
      availableCount = count - currentSelectionCount;
      text = currentSelectionCount + availableCount;
    }
    checkboxHelper.container.reservedLabel.reservedAvailableText.innerHTML = text;
    checkboxHelper.container.reservedLabel.reservedAvailableCount = availableCount;
  }

  function updateCheckboxAvailabilitiesCount(tags, tagTitlesArray)
  {
    let mergeFunction = getModeMergeFunction();
    let checkboxContainerHelpers = getCheckboxContainerHelpers(getAllCheckboxes);
    let flattenedCheckedURLs = flattenTagTitlesArrayURLs(tags, tagTitlesArray)
    checkboxContainerHelpers.forEach(function (containerHelper) {
      let currentCheckboxFlatURLs = getFlattenedBookmarksForTag(tags, containerHelper.checkbox.value);
      let availableCount = mergeFunction([flattenedCheckedURLs, currentCheckboxFlatURLs]).length;
      updateCheckboxAvailableCount(containerHelper, availableCount, flattenedCheckedURLs.length);
    });
  }

  function updateGoButtonCount()
  {
    let goButton = document.getElementById('goButton');
    let count = countIntersectedURLsFromChecked();
    goButton.innerHTML = "Go! (" + count + ")";
    if (count === 0)
    {
      goButton.disabled = true;
    }
    else
    {
      goButton.disabled = false;
    }
  }

  function countIntersectedURLsFromChecked()
  {
    return generateIntersectedURLsFromChecked().length;
  }

  function generateIntersectedURLsFromChecked()
  {
    let tagTitlesArray = getCheckedTagTitles();
    return flattenTagTitlesArrayURLs(tags, tagTitlesArray);
  }

  function getCheckedTagTitles()
  {
    let checkboxes = getCheckedCheckboxes();
    return checkboxes.map(checkbox => checkbox.value);
  }

  function filterTagsFactory(tags, callback)
  {
    return function ()
    {
      filterTags(tags, callback);
    }
  }

  function filterTags(tags, callback)
  {
    let input = document.getElementById("tagFilterInput");
    let filteredTags = tags.filter(tag => tag.title.includes(input.value));
    callback(filteredTags);
  }

  function insertButtons(actionDiv, tags, clickEvent)
  {
    let container = createNewContainer();
    container.id = 'buttonsContainer';
    let allButton = document.createElement('button');
    allButton.id = 'allButton';
    let totalCount = uniqueBookmarks(tags).length;
    allButton.innerHTML = 'All (' + totalCount + ')';
    if (totalCount === 0)
    {
      allButton.disabled = true;
    }
    allButton.addEventListener('click', quickAllToSlideshowFactory(tags));
    container.appendChild(allButton);
    let modeButton = document.createElement('button');
    modeButton.id = 'modeButton';
    modeButton.innerHTML = 'And';
    modeButton.mode = 0;
    modeButton.addEventListener('click', modeChangedFactory(tags));
    container.appendChild(modeButton);
    let goButton = document.createElement('button');
    goButton.id = "goButton";
    goButton.innerHTML = "Go! (0)";
    goButton.addEventListener('click', confirmSelection);
    goButton.disabled = true;
    container.appendChild(goButton);
    let resetButton = document.createElement('button');
    resetButton.id = "resetButton";
    resetButton.innerHTML = "Clear";
    resetButton.addEventListener('click', resetCheckboxesFactory(tags));
    resetButton.disabled = false;
    container.appendChild(resetButton);
    actionDiv.appendChild(container);
  }

  function resetCheckboxesFactory(tags)
  {
    return function ()
    {
      resetCheckboxes();
      updateCheckboxDependentBrowseComponents(tags);
    }
  }

  function modeChangedFactory(tags)
  {
    return function ()
    {
      toggleBrowseMode();
      resetCheckboxes();
      updateCheckboxDependentBrowseComponents(tags);
    }
  }

  function toggleBrowseMode()
  {
    let modeButton = document.getElementById('modeButton');
    if (modeButton.mode === 0)
    {
      modeButton.innerHTML = "Or";
      modeButton.mode = 1;
    }
    else
    {
      modeButton.innerHTML = "And";
      modeButton.mode = 0;
    }
  }

  function unionMode()
  {
    let modeButton = document.getElementById('modeButton');
    return modeButton.mode === 1;
  }

  function getModeMergeFunction()
  {
    let modeButton = document.getElementById('modeButton');
    if (modeButton.mode === 0)
    {
      return intersectedURLs;
    }
    else
    {
      return unionedURLs;
    }
  }

  function quickAllToSlideshowFactory(tags)
  {
    return function() {
      quickAllToSlideshow(tags);
    }
  }

  function createLinker(title, clickEvent)
  {
    let arrow = document.createElement('span');
    arrow.addEventListener('click', clickEvent);
    arrow.innerHTML = title;
    arrow.className = 'link';
    return arrow;
  }

  function quickClickToSlideshow(tags, item) {
    generateSlideShowFromTags(tags, [item.title]);
  }

  function quickAllToSlideshow(tags, item) {
    let flattenedURLs = uniqueBookmarks(tags);
    generateSlideShow(flattenedURLs);
  }

  function updateMultibox(tags, placeholderText, updateEvent)
  {
    if (tags.length === 0)
    {
      displayMultiboxTitle('No tags');
    }
    else
    {
      displayMultiboxInput(placeholderText, updateEvent);
    }
  }

  function setupPopup()
  {
    activateBrowseMode(true);
  }

  function activateBrowseMode(initial = false)
  {
    buttonPointsToTagMode(initial);
    sendTagsToCallback(activeDivToBrowseMode);
  }

  function buttonPointsToTagMode(initial = false)
  {
    let tagNewPageButton = document.getElementById('tagNewPageButton');
    if (initial !== true)
    {
      tagNewPageButton.removeEventListener('click', activateBrowseMode);
      tagNewPageButton.innerHTML = "Tag";
    }
    tagNewPageButton.addEventListener('click', activateTagMode);
  }

  function activateTagMode()
  {
    buttonPointsToBrowseMode();
    sendTagsToCallback(activeDivToTagMode);
  }

  function activeDivToTagMode(tags)
  {
    updateMultibox(tags, 'Choose tags', filterTagsFactory(tags, filterCheckboxes));
    populateTagPageChoices(tags);
  }

  function populateTagPageChoices(tags)
  {
    let buttonDiv = document.getElementById('buttonDiv');
    clearDOMNode(buttonDiv);
    let page = document.getElementById('actionDiv');
    clearDOMNode(page);
    let newTagButton = document.createElement('button');
    newTagButton.innerHTML = "New...";
    newTagButton.addEventListener('click', addNewTag);
    page.appendChild(newTagButton);
    tagsToCheckboxes(page, tags, focusToFilterInput);
    if (tags.length !== 0)
    {
      let tagPageButton = document.createElement('button');
      tagPageButton.innerHTML = "Tag";
      tagPageButton.addEventListener('click', tagPage);
      page.appendChild(tagPageButton);
    }
  }

  function focusToFilterInput()
  {
    let filterInput = document.getElementById('tagFilterInput');
    filterInput.focus();
  }

  function addCountsToLabel(label, naturalTotal)
  {
    let counts = document.createElement('span');
    let total = document.createElement('span');
    total.appendChild(document.createTextNode(naturalTotal));
    counts.appendChild(document.createTextNode(' ('));
    counts.appendChild(total);
    counts.appendChild(document.createTextNode(')'));
    label.appendChild(counts);
    label.reservedAvailableText = total;
    label.reservedNaturalTotal = naturalTotal;
    label.reservedAvailableCount = naturalTotal;
  }

  function tagsToCheckboxes(page, tags, updateEvent = null, clickEvent = null)
  {
    orderTags(tags);
    for (let item of tags) {
      let container = createNewContainer();
      let label = document.createElement('label');
      let titleSpan = document.createElement('span');
      titleSpan.innerHTML =  item.title;
      label.appendChild(titleSpan);
      if (clickEvent)
      {
        let count = flattenBookmarks(item).length;
        addCountsToLabel(label, count);
        addClickEvent(container, clickEventFactory(clickEvent, tags, item));
        if (count === 0)
        {
          container.hidden = true;
        }
      }
      let check = document.createElement('input');
      check.setAttribute("type", "checkbox");
      check.setAttribute("value", item.title);
      if (updateEvent)
      {
        check.addEventListener('change', updateEvent);
      }
      label.appendChild(check);
      container.appendChild(label);
      container.reservedLabel = label;
      page.appendChild(container);
    }
  }

  function orderTags(tags)
  {
    tags.sort(function (current, next) {
      if (current.title < next.title)
        return -1;
      if (current.title > next.title)
        return 1;
      return 0;
    });
  }

  function createNewContainer()
  {
    let container = document.createElement('div');
    return container;
  }

  function clickEventFactory(clickEvent, tags, item)
  {
    return function() {
      clickEvent(tags, item);
    }
  }

  function addClickEvent(container, clickEvent)
  {
    let arrow = createLinker('-> ', clickEvent);
    container.appendChild(arrow);
  }

  function tagPage()
  {
    sendCheckboxesToCallback(tagPageByCheckboxes) 
  }

  function confirmSelection()
  {
    sendCheckboxesToCallback(generateSlideshowByCheckboxes) 
  }

  function getCheckedCheckboxes()
  {
    let inputs = Array.prototype.slice.call(document.getElementsByTagName('input'));
    return inputs.filter(item => item.type == "checkbox" && item.checked == true);
  }

  function getAllCheckboxes()
  {
    let inputs = Array.prototype.slice.call(document.getElementsByTagName('input'));
    return inputs.filter(item => item.type == "checkbox");
  }

  function sendCheckboxesToCallback(callback) 
  {
    let checkboxes = getCheckedCheckboxes();
    if (checkboxes.length === 0)
    {
      alert('No tag selected');
    }
    else
    {
      callback(checkboxes);
    }
  }

  function generateSlideshowByCheckboxes(checkboxes)
  {
    tagTitlesArray = checkboxes.map(checkbox => checkbox.value);
    sendTagsToCallback(generateSlideShowFromTagsFactory(tagTitlesArray));
  }

  function generateSlideShowFromTagsFactory(tagTitlesArray)
  {
    return function (tags)
    {
      generateSlideShowFromTags(tags, tagTitlesArray);
    }
  }

  function tagPageByCheckboxes(checkboxes)
  {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      if (tabs.length !== 1)
      {
        console.log(tabs);
        alert('Something very strange is going on: multiple active windows. Check console log');
      }
      else
      {
        sendTagsToCallback(addPageToTagsFactory(checkboxes, tabs[0]));
      }
    });
  }

  function addPageToTagsFactory(checkboxes, tab)
  {
    return function (tags) {
      addPageToTags(tags, checkboxes, tab);
    }
  }

  function addPageToTags(tags, checkboxes, tab)
  {
    if (checkboxes.length > 0)
    {
      checkbox = checkboxes.pop();
      let relevantTags = tags.filter(tag => tag.title == checkbox.value);
      if (relevantTags.length !== 1)
      {
        alert(relevantTags.length + ' tags called ' + checkbox.value);
      }
      else
      {
        let tag = relevantTags[0];
        if (! flattenBookmarks(tag).map(obj => obj.url).includes(tab.url))
        {
          chrome.bookmarks.create({title: tab.title, url: tab.url, parentId: tag.id}, function () {
            addPageToTags(tags, checkboxes, tab);
          });
        }
        else
        {
          addPageToTags(tags, checkboxes, tab);
        }
      }
    }
    else
    {
      window.close();
    }
  }

  function addNewTag()
  {
    displayMultiboxTitle('Enter name');
    let page = document.getElementById('actionDiv');
    clearDOMNode(page);
    let newTagInput = document.createElement('input');
    newTagInput.id = "newTagInput";
    newTagInput.addEventListener('keyup', function (event) {
      if (event.keyCode === 13) {
        saveTagWithBaseCheck(newTagInput);
     }
    });
    let commitNewTagButton = document.createElement('button');
    commitNewTagButton.innerHTML = "Add tag"
    commitNewTagButton.addEventListener('click', function () {
      saveTagWithBaseCheck(newTagInput);
    });
    page.appendChild(newTagInput);
    page.appendChild(commitNewTagButton);
    newTagInput.focus();
  }

  function saveTagWithBaseCheck(newTagInput)
  {
    chrome.bookmarks.search('video_tags', function (tagsNode) {
      if (tagsNode.length === 0)
      {
        chrome.bookmarks.create({title: 'video_tags'}, function (newFolder) {
          saveSingletonTagToFolder(newFolder.id, newTagInput);
        });
      }
      else if (tagsNode.length > 1)
      {
        alert('Please ensure you only have one bookmark folder called "video_tags".');
      }
      else
      {
        saveSingletonTagToFolder(tagsNode[0].id, newTagInput)
      }
    });
  }

  function saveSingletonTagToFolder(folderId, newTagInput)
  {
    sendTagsToCallback(saveTagIfNotExistingFactory(folderId, newTagInput));
  }

  function saveTagIfNotExistingFactory(folderId, newTagInput)
  {
    return function (tags)
    {
      let newTitle = newTagInput.value.toLowerCase();
      if (tags.filter(function (item) {item.title == newTitle;}).length === 0)
      {
        chrome.bookmarks.create({title: newTitle, parentId: folderId}, function () {
          sendTagsToCallback(activeDivToTagMode);
        });
      }
    }
  }

  function buttonPointsToBrowseMode()
  {
    let tagNewPageButton = document.getElementById('tagNewPageButton');
    tagNewPageButton.removeEventListener('click', activateTagMode);
    tagNewPageButton.innerHTML = "Back";
    tagNewPageButton.addEventListener('click', activateBrowseMode);
  }

  function clearDOMNode(element)
  {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function flattenBookmarks(bookmarkTreeNodes)
  {
    return bookmarkTreeNodes.children.reduce(function (urls, item) {
      if (item.url)
      {
        host = getHost(item.url);
        if (availableSites[host])
        {
            urls = urls.concat({url: item.url, code: availableSites[host]});
        }
      }
      else
      {
        urls = urls.concat(flattenBookmarks(item));
      }
      return urls;
    }, []);
  }

  function uniqueBookmarks(tags)
  {
    let completeArray = tags.reduce(function (completeArray, tag) {
      completeArray = completeArray.concat(flattenBookmarks(tag));
      return completeArray;
    }, []);
    return uniqueURLs(completeArray);
  }

  function tagsAreSane(tags)
  {
    let retVal = true;
    if (tags.length === 0)
    {
      alert('No such bookmark folder');
      retVal = false;
    }
    else if (tags.length > 1)
    {
      alert('Too many matching folders.');
      retVal = false;
    }
    return retVal;
  }

  function generateSlideShowFromTags(tags, tagTitlesArray = [])
  {
    let flattenedURLs = flattenTagTitlesArrayURLs(tags, tagTitlesArray);
    generateSlideShow(flattenedURLs);
  }

  function flattenTagTitlesArrayURLs(tags, tagTitlesArray = [])
  {
    flattenedURLsArray = tagTitlesArray.map(function (tagTitle) {
      return getFlattenedBookmarksForTag(tags, tagTitle);
    });
    let mergeFunction = getModeMergeFunction();
    return mergeFunction(flattenedURLsArray)
  }

  function getFlattenedBookmarksForTag(tags, tagTitle)
  {
    let searchResults = tags.filter(item => (item.title == tagTitle));
      if (tagsAreSane(searchResults))
      {
        return flattenBookmarks(searchResults[0]);
      }
      else
      {
        return [];
      }
  }

  function intersectedURLs(flattenedURLsArray)
  {
    flattenedURLs = [];
    if (flattenedURLsArray.length > 0)
    {
      flattenedURLs = flattenedURLsArray.pop();
    }
    if (flattenedURLsArray.length > 0)
    {
      flattenedURLs = reduceURLsArray(flattenedURLsArray, flattenedURLs);
    }
    return flattenedURLs;
  }

  function unionedURLs(flattenedURLsArray)
  {
    let completeArray = flattenedURLsArray.reduce(function (completeArray, flattenedURLs) {
      completeArray = completeArray.concat(flattenedURLs);
      return completeArray;
    }, []);
    return uniqueURLs(completeArray);
  }

  function uniqueURLs(completeArray)
  {
    let seen = {};
    return completeArray.filter(function (obj) {
      let beenSeen = seen[obj.url] || false;
      seen[obj.url] = true;
      return !beenSeen;
    });
  }

  function reduceURLsArray(flattenedURLsArray, flattenedURLs)
  {
    return flattenedURLsArray.reduce(function (flattenedURLs, URLArray) {
      return flattenedURLs.filter(function (urlObj) {
        return URLArray.map(obj => obj.url).includes(urlObj.url);
      });
    }, flattenedURLs);
  }

  function generateSlideShow(flattenedURLs)
  {
    if(flattenedURLs.length > 0)
    {
      shuffleArray(flattenedURLs);
      chrome.storage.sync.set({flattenedURLs: flattenedURLs}, function () {
        chrome.tabs.create({url: 'video.html'});
      });
    }
    else
    {
      alert('No available videos');
    }
  }

  function getHost(url)
  {
    var a = document.createElement('a');
    a.href = url;
    hostSplit = a.hostname.split('www.');
    return hostSplit[(hostSplit.length - 1)];
  }

  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}