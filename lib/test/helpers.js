
var assert = require("assert");

suite("helpers", function()
{
  var _helpers = require("../helpers");

  suite("decodeRepositoryUrl", function()
  {
    test("Parse /com/test/dummy/1.0.0/dummy-1.0.0.tgz", function(done)
    {
      var expectedResult = {
        enableRedeploy: false,
        repository: 'repoDummy',
        filename: 'dummy-1.0.0.tgz',
        directory: '/com/test/dummy/1.0.0/',
        isArtifact: true,
        groupId: 'com.test',
        artifactId: 'dummy',
        version: '1.0.0',
        classifier: false,
        extension: 'tgz'
      };
      
      _helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0.tgz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
        
        delete result.versionScheme;
        
        assert.deepEqual(expectedResult, result);
        done();
      });
    });
    
    test("Parse /com/test/dummy/1.0.0/dummy-1.0.0-src.tgz", function(done)
    {
      var expectedResult = {
        enableRedeploy: false,
        repository: 'repoDummy',
        filename: 'dummy-1.0.0-src.tgz',
        directory: '/com/test/dummy/1.0.0/',
        isArtifact: true,
        groupId: 'com.test',
        artifactId: 'dummy',
        version: '1.0.0',
        classifier: 'src',
        extension: 'tgz'
      };

      _helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0-src.tgz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
        
        delete result.versionScheme;
          
        assert.deepEqual(expectedResult, result);
        done();
      });
    });

    test("Parse /com/test/dummy/1.0.0/dummy-1.0.0-src.tar.gz and check extension is tar.gz and classifier is src", function(done)
    {
      _helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/1.0.0/dummy-1.0.0-src.tar.gz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
        
        delete result.versionScheme;
          
        assert.equal("tar.gz", result.extension);
        assert.equal("src", result.classifier);
        done();
      });
    });
    
    test("Parse /com/test/dummy/R1A02_3/dummy-R1A02_3-src.tar.gz and that slashed versions work", function(done)
    {
      _helpers.decodeRepositoryUrl("repoDummy", "/com/test/dummy/R1A02_3/dummy-R1A02_3-src.tar.gz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
        
        delete result.versionScheme;
          
        assert.equal("R1A02_3", result.version);
	assert.equal("tar.gz", result.extension);
        assert.equal("src", result.classifier);
        done();
      });
    });
  });
});
