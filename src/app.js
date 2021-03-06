angular.module('knowledge', ['ngRoute', 'ngSanitize'])
	.config(function($routeProvider, $locationProvider, $rootScopeProvider) {
		$locationProvider.html5Mode(true).hashPrefix('!');
		$routeProvider.when('/', {
			templateUrl: '/views/list.html',
			controller: 'KnowledgeListCtrl',
      reloadOnSearch: false
		});
		$routeProvider.when('/mysetup', {
			templateUrl: '/views/mysetup.html',
			controller: 'MySetupCtrl'
		});
	})
  .service('DataService', ['$http', function($http){
    function DeferedData(){
      this.on = function(callback){
        this.dataCallback = callback;
        if('latest' in this)
          this.dataCallback(this.latest);
      };
      this.update = function(newValue){
        this.latest = newValue;
        if(this.dataCallback)
          this.dataCallback(newValue);
      };
      this.get = function(){
        return this.latest;
      };
    }
    return {
      getYAML: function(file){
        var defer = new DeferedData();
        $http.get(file).then(function(data){
          var content = data.data;
          defer.update(jsyaml.load(content));
        });
        return defer;
      }
    };
  }])
  
  
	.controller('MySetupCtrl', ['$scope', '$route', 'DataService', function($scope, $route, DataService){
		DataService.getYAML('mysetup.yml').on(function(data){
      $scope.mysetup = data;
    });
	}])
  
  
	.controller('KnowledgeListCtrl', ['$scope', '$route', '$location', 'DataService', function($scope, $route, $location, DataService){
    $scope.searchText = $location.search().q || '';
    $scope.resultSearch = {};
    $scope.firstResult = null;
    
    DataService.getYAML('knowledge.yml').on(function(data){
      calcArrayKeywords(data);
      $scope.knowledge = data;
      updateSearch();
    });
    $scope.$watch('searchText', updateSearch);
    $scope.$on('$routeUpdate', function(){
      if($scope.searchText != $location.search().q)
        $scope.searchText = $location.search().q || '';
    });
    function updateSearch(){
      $scope.searchText = $scope.searchText.replace(/\+([^\+\s])/g, ' $1');
      if($scope.searchText.length===0){
        $scope.filteredKnowledge = $scope.knowledge;
        $scope.firstResult = null;
        $location.search('q', null);
      }
      else{
        $location.search({q: $scope.searchText});
        var keywords = $scope.searchText.split(" ");
        arrayToLowercase(keywords);
        $scope.filteredKnowledge = searchItemArray($scope.knowledge, keywords);
        $scope.firstResult = findFirstResult($scope.filteredKnowledge);
      }
      $location.replace(); //don't keep history of every keystroke, only remember latest query
    }
    $scope.submitSearch = function(){
      if($scope.searchText){
        if($scope.firstResult.result && $scope.firstResult.result.link)
          window.location = $scope.firstResult.result.link;
        else
          window.location = 'https://www.google.com/search?q='+$scope.searchText;
      }
    };
    $scope.submitResultSearch = function(){
      if($scope.resultSearch.text){
        if($scope.firstResult.result && $scope.firstResult.result.search)
          window.location = $scope.firstResult.result.search.replace("%s", encodeURIComponent($scope.resultSearch.text));
      }
    };
    $scope.$watch('firstResult', function(firstResult){
      if(firstResult && firstResult.result && firstResult.result.content){
        if(!firstResult.result.contentHTML){//TODO delete old search
          firstResult.result.contentHTML = markdown.toHTML(firstResult.result.content);
        }
      }
    });
    
    function itemContains(item, keywords){
      var remainingKeywords = [];
      for(var i in keywords){
        var keyword = keywords[i];
        var found = false;
        for(var j in item._keywords){
          var itemKeyword = item._keywords[j];
          if(itemKeyword.indexOf(keyword)!=-1)
            found = true;
        }
        if(!found)
          remainingKeywords.push(keyword);
      }
      return remainingKeywords;
    }
    function itemArrayComparator(a, b){
      if(a.partial && b.partial)
        return 0;
      if(!a.partial && !b.partial)
        return 0;
      if(a.partial)
        return 1;
      if(b.partial)
        return -1;
    }
    function searchItemArray(array, keywords){
      var result = [];
      for(var i in array){
        var item = array[i];
        var remainingKeywords = itemContains(item, keywords);
        if(remainingKeywords.length===0)
          result.push(item);
        else if(item.items){
          var matchingSubItems = searchItemArray(item.items, remainingKeywords);
          if(matchingSubItems.length>0)
            result.push($.extend({}, item, {items: matchingSubItems, partial: true}));
        }
        result.sort(itemArrayComparator);
      }
      return result;
    }
    function findFirstResult(results, depth){
      depth = depth || 0;
      var result;
      for(var i in results){
        result = results[i];
        if(!result.partial)
          return { result: result, depth: depth };
      }
      var bestSubResult = {result: null, depth: Infinity};
      for(i in results){
        result = results[i];
        var subResult = findFirstResult(result.items, depth+1);
        if(subResult.depth<bestSubResult.depth)
          bestSubResult = subResult;
      }
      return bestSubResult;
    }
    function calcArrayKeywords(array){
      for(var i in array){
        var item = array[i];
        calcKeywords(item);
      }
    }
    function calcKeywords(item){
      var keywords = item.name.split(" ");
      if(item.keywords)
        keywords = keywords.concat(item.keywords);
      if(item.type)
        keywords.push(item.type);
      if(item.description)
        keywords = keywords.concat(item.description.split(" "));
      arrayToLowercase(keywords);
      item._keywords = keywords;
      calcArrayKeywords(item.items);
    }
	}])
  
  
  .directive('knowledgeItem', function($compile){
    return {
      restrict: 'E',
      scope: {
        'item': '='
      },
      templateUrl: 'itemtemplate.html',
      compile: function(tElement, tAttr) {
          var contents = tElement.contents().remove();
          var compiledContents;
          return function(scope, iElement, iAttr) {
              if(!compiledContents) {
                  compiledContents = $compile(contents);
              }
              compiledContents(scope, function(clone, scope) {
                       iElement.append(clone); 
              });
          };
      }
    };
  });

  
  
  
function arrayToLowercase(array){
  for(var i in array)
    array[i] = array[i].toLowerCase();
}